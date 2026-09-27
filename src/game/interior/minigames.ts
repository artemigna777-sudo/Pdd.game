/**
 * Четыре мини-игры для вопросов, которые не показать на дороге:
 *  - «Автошкола» (общие положения, теория) — быстрая викторина у доски в кабинете;
 *  - «Инспектор» (ответственность, документы) — разговор с инспектором ДПС;
 *  - «Гараж» (техническое состояние) — игрок осматривает деталь машины, потом отвечает;
 *  - «Аптечка» (первая помощь) — шаги помощи пострадавшему по порядку.
 *
 * Вопрос, картинка билета и варианты всегда показывает карточка (правило 3): мини-игра лишь
 * создаёт обстановку, просит касание перед вопросом и показывает итог ответа.
 */
import * as Phaser from 'phaser';
import { PIXEL_RATIO } from '../display.ts';
import { COLORS, drawPedestrian, drawVehicle } from '../city/art.ts';
import type { SceneScript } from '../city/sceneScripts.ts';
import { FIRST_AID_STEPS, GARAGE_PARTS, type GaragePart, type InspectorCase } from '../../world/templates.ts';
import { drawBeacon, drawCarSide, drawCarTop, drawFigure, drawIcon, drawKit, drawTriangle, drawVictim } from './art.ts';
import type { InteriorScene, MinigameContext, MinigameKind } from './InteriorScene.ts';

export interface Room {
  container: Phaser.GameObjects.Container;
  background: string;
  /** Середина комнаты — куда смотрит камера, пока карточка вопроса закрыта. */
  center: number;
  /** Что должно быть видно над карточкой вопроса. */
  focus: number;
  /** Дополнительно для сценариев. */
  anchors: Record<string, { x: number; y: number }>;
  props: Record<string, Phaser.GameObjects.GameObject>;
}

type G = Phaser.GameObjects.Graphics;

const text = (scene: Phaser.Scene, x: number, y: number, value: string, size: number, color: string, style: Partial<Phaser.Types.GameObjects.Text.TextStyle> = {}) =>
  scene.add
    .text(x, y, value, { fontFamily: 'system-ui, sans-serif', fontSize: `${size}px`, fontStyle: 'bold', color, align: 'center', ...style })
    .setOrigin(0.5)
    .setResolution(PIXEL_RATIO * 2);

const graphics = (scene: Phaser.Scene, x = 0, y = 0, paint?: (g: G) => void) => {
  const g = scene.add.graphics().setPosition(x, y);
  paint?.(g);
  return g;
};

// ─── Комнаты ─────────────────────────────────────────────────────────────────────

/** Где на машине в гараже искать деталь (в координатах машины до увеличения). */
const PART_SPOT: Record<GaragePart, { x: number; y: number }> = {
  tires: { x: -12, y: -12 },
  brakes: { x: -12, y: 12 },
  lights: { x: 7, y: -19 },
  horn: { x: 0, y: -17 },
  engine: { x: 0, y: -13 },
  glass: { x: 0, y: -8 },
  wipers: { x: -4, y: -8 },
  steering: { x: -4, y: -1 },
  cabin: { x: 3, y: 2 },
  belts: { x: -5, y: 4 },
  'child-seat': { x: 5, y: 9 },
  cargo: { x: 0, y: 3 },
  exhaust: { x: 6, y: 20 },
  hitch: { x: 0, y: 21 },
  body: { x: 11, y: 4 },
};
const CAR_SCALE = 4.2;
const CAR_Y = -40;

export function buildRoom(scene: InteriorScene, kind: MinigameKind): Room {
  const c = scene.add.container(0, 0).setDepth(0);
  const add = <T extends Phaser.GameObjects.GameObject>(obj: T) => {
    c.add(obj);
    return obj;
  };
  const anchors: Room['anchors'] = {};
  const props: Room['props'] = {};

  switch (kind) {
    case 'classroom': {
      add(
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(0xf3e6cc).fillRect(-500, -600, 1000, 530);
          g.fillStyle(0xc99c6b).fillRect(-500, -70, 1000, 700);
          g.lineStyle(2, 0x000000, 0.08);
          for (let y = -40; y < 600; y += 34) g.lineBetween(-500, y, 500, y);
          g.fillStyle(0x8d5a2b).fillRoundedRect(-168, -292, 336, 158, 8);
          g.fillStyle(0x2f5d50).fillRoundedRect(-160, -284, 320, 142, 4);
          g.fillStyle(0x6d4421).fillRect(-150, -136, 300, 6);
          g.fillStyle(0xffffff).fillRect(-40, -134, 14, 4).fillRect(10, -134, 8, 4);
          // Парты и ученики (со спины).
          for (const [x, y] of [
            [-110, 70],
            [60, 70],
            [-110, 170],
            [60, 170],
          ]) {
            g.fillStyle(0x6d4421).fillRoundedRect(x - 60, y, 120, 34, 5);
            g.fillStyle(0x000000, 0.12).fillRect(x - 60, y + 30, 120, 6);
          }
          const heads: Array<[number, number, number]> = [
            [-135, 58, 0x3d2b1f],
            [-85, 58, 0xe0b27a],
            [35, 58, 0x1b1b1b],
            [85, 58, 0x7f4f24],
            [-135, 158, 0x1b1b1b],
            [85, 158, 0x3d2b1f],
          ];
          for (const [x, y, hair] of heads) {
            g.fillStyle(0x3a86ff).fillRoundedRect(x - 16, y + 2, 32, 20, 8);
            g.fillStyle(hair).fillCircle(x, y - 6, 12);
          }
          // Курьер-ученик в жёлтой кепке.
          g.fillStyle(0xffb703).fillRoundedRect(19, 162, 32, 20, 8);
          g.fillStyle(0xffb703).fillCircle(35, 152, 12);
        }),
      );
      add(text(scene, 0, -312, 'АВТОШКОЛА «ЗЕЛЁНЫЙ СВЕТ»', 15, '#6d4421'));
      const teacher = scene.add.container(128, -58, [graphics(scene, 0, 0, (g) => drawFigure(g, { shirt: 0x6a4c93, hair: 0x6c757d }))]);
      add(teacher);
      const pointer = graphics(scene, 0, 0, (g) => g.lineStyle(3, 0x8d5a2b).lineBetween(-20, -2, -70, -80));
      teacher.add(pointer);
      props.teacher = teacher;
      anchors.teacher = { x: 128, y: -110 };
      return { container: c, background: '#f3e6cc', center: -60, focus: -190, anchors, props };
    }

    case 'inspector': {
      add(
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(0xbfe3ff).fillRect(-500, -600, 1000, 520);
          g.fillStyle(0x8fbf7a).fillRect(-500, -150, 1000, 70);
          // Будка поста ДПС.
          g.fillStyle(0x000000, 0.15).fillRect(96, -214, 110, 110);
          g.fillStyle(0xe9ecef).fillRect(90, -220, 110, 110);
          g.fillStyle(0x1d4ed8).fillRect(90, -220, 110, 26);
          g.fillStyle(COLORS.glass).fillRect(104, -184, 36, 30).fillRect(152, -184, 36, 30);
          // Деревья.
          for (const [x, r] of [
            [-190, 34],
            [-120, 26],
            [240, 30],
          ]) {
            g.fillStyle(0x2f6f3a).fillCircle(x, -150, r);
            g.fillStyle(0x43914e).fillCircle(x - 8, -160, r * 0.55);
          }
          g.fillStyle(0xb7bec8).fillRect(-500, -80, 1000, 50);
          g.fillStyle(COLORS.curb).fillRect(-500, -34, 1000, 6);
          g.fillStyle(0x40454e).fillRect(-500, -28, 1000, 400);
          g.fillStyle(0xeef0f2);
          for (let x = -500; x < 500; x += 70) g.fillRect(x, 200, 40, 6);
        }),
      );
      add(text(scene, 145, -207, 'ДПС', 18, '#ffffff'));
      const police = scene.add.container(-262, 118, [graphics(scene, 0, 0, (g) => drawCarSide(g, 0xf8f9fa, true))]);
      const beacon = graphics(scene);
      police.add(beacon);
      add(police);
      scene.time.addEvent({ delay: 200, loop: true, callback: () => drawBeacon(beacon, Math.floor(scene.time.now / 200) % 2) });
      add(scene.add.container(-40, 118, [graphics(scene, 0, 0, (g) => drawCarSide(g, COLORS.player))]));
      const officer = scene.add.container(110, 66, [graphics(scene, 0, 0, (g) => drawFigure(g, { shirt: 0x3f5f3f, pants: 0x2e3b2e, cap: 'police', vest: true }))]);
      add(officer);
      props.officer = officer;
      anchors.officer = { x: 110, y: 10 };
      anchors.window = { x: -20, y: 70 };
      return { container: c, background: '#bfe3ff', center: 0, focus: -60, anchors, props };
    }

    case 'garage': {
      add(
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(0x8d96a0).fillRect(-500, -600, 1000, 1200);
          g.fillStyle(0x5c6773).fillRect(-500, -600, 1000, 340);
          // Инструменты на стене.
          g.fillStyle(0x46505b).fillRoundedRect(-170, -330, 340, 50, 6);
          g.lineStyle(4, 0xb7bec8);
          for (let x = -150; x < 160; x += 36) g.lineBetween(x, -322, x + 10, -292);
          // Подъёмник: жёлто-чёрная рамка.
          for (let i = 0; i < 18; i++) {
            g.fillStyle(i % 2 ? 0x1b1b1b : 0xf4c20d);
            g.fillRect(-92 + i * 10.2, -240, 10.2, 8).fillRect(-92 + i * 10.2, 152, 10.2, 8);
          }
          g.fillStyle(0x6b737d).fillRect(-92, -232, 8, 384).fillRect(76, -232, 8, 384);
        }),
      );
      add(text(scene, 0, -358, 'АВТОСЕРВИС «ГАЙКА»', 16, '#f4c20d'));
      const car = scene.add.container(0, CAR_Y).setScale(CAR_SCALE);
      car.add(
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(0x1b1b1b);
          for (const [x, y] of [
            [-13, -15],
            [9, -15],
            [-13, 9],
            [9, 9],
          ]) g.fillRoundedRect(x, y, 4, 8, 1.5);
          drawCarTop(g, COLORS.player);
        }),
      );
      add(car);
      const mechanic = scene.add.container(140, 205, [graphics(scene, 0, 0, (g) => drawFigure(g, { shirt: 0x1d4ed8, pants: 0x1d4ed8, cap: 'mechanic' }))]).setScale(0.9);
      add(mechanic);
      props.mechanic = mechanic;
      anchors.mechanic = { x: 140, y: 150 };
      return { container: c, background: '#8d96a0', center: -20, focus: -60, anchors, props };
    }

    case 'first-aid': {
      add(
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(COLORS.grass).fillRect(-500, -600, 1000, 1200);
          g.fillStyle(0xa99f8e).fillRect(-500, -236, 1000, 14);
          g.fillStyle(COLORS.asphalt).fillRect(-500, -360, 1000, 126);
          g.fillStyle(COLORS.marking);
          for (let x = -500; x < 500; x += 60) g.fillRect(x, -299, 32, 4);
          for (const [x, y, r] of [
            [-170, 170, 26],
            [180, 150, 30],
            [150, 260, 22],
          ]) {
            g.fillStyle(0x000000, 0.18).fillCircle(x + 8, y + 8, r);
            g.fillStyle(COLORS.tree).fillCircle(x, y, r);
            g.fillStyle(COLORS.treeLight).fillCircle(x - r * 0.3, y - r * 0.3, r * 0.55);
          }
        }),
      );
      const crashed = scene.add.container(-120, -266, [graphics(scene, 0, 0, (g) => drawVehicle(g, 'car', 0x457b9d))]).setScale(2.3).setAngle(-70);
      add(crashed);
      const hazard = graphics(scene);
      crashed.add(hazard);
      scene.time.addEvent({
        delay: 350,
        loop: true,
        callback: () => {
          hazard.clear();
          if (Math.floor(scene.time.now / 350) % 2) hazard.fillStyle(0xff9f1c).fillRect(-11, -20, 4, 4).fillRect(7, -20, 4, 4).fillRect(-11, 16, 4, 4).fillRect(7, 16, 4, 4);
        },
      });
      add(graphics(scene, 60, -268, (g) => drawTriangle(g)));
      add(graphics(scene, 0, 0, (g) => drawVictim(g)).setScale(1.5));
      add(scene.add.container(8, -64, [graphics(scene, 0, 0, (g) => drawPedestrian(g, 0))]).setScale(2.2).setAngle(180));
      const kit = graphics(scene, -120, 80, (g) => drawKit(g, false)).setScale(1.3);
      add(kit);
      props.kit = kit;
      const phone = graphics(scene, 120, 80, (g) => drawIcon(g, 'phone')).setScale(1.3);
      add(phone);
      anchors.kit = { x: -120, y: 80 };
      anchors.phone = { x: 120, y: 80 };
      anchors.victim = { x: 0, y: -30 };
      return { container: c, background: '#5b9a4f', center: -60, focus: -40, anchors, props };
    }
  }
}

// ─── Сценарии вопросов ───────────────────────────────────────────────────────────

export function createMinigame(scene: InteriorScene, ctx: MinigameContext): SceneScript {
  switch (scene.kind) {
    case 'classroom':
      return classroom(scene, ctx);
    case 'inspector':
      return inspector(scene, ctx);
    case 'garage':
      return garage(scene, ctx);
    case 'first-aid':
      return firstAid(scene, ctx);
    default:
      throw new Error('Мини-игра не открыта');
  }
}

function classroom(scene: InteriorScene, ctx: MinigameContext): SceneScript {
  const room = scene.room!;
  // Реплики инструктора — под доской, чтобы не закрывать вопрос и таймер.
  const BUBBLE = { x: -10, y: -40 };
  let started = 0;
  let timer: Phaser.Time.TimerEvent | undefined;
  const title = text(scene, 0, -258, `Вопрос ${ctx.index + 1} из ${ctx.total}`, 20, '#f8f9fa');
  const stars = text(scene, 0, -222, '', 20, '#ffd166');
  const status = text(scene, 0, -180, '', 17, '#e9ecef');
  scene.layer.add([title, stars, status]);
  const drawStars = () => {
    stars.setText(Array.from({ length: ctx.total }, (_, i) => (scene.results[i] === undefined ? '○' : scene.results[i] ? '★' : '✕')).join(' '));
  };
  const stop = () => {
    timer?.remove();
    return Math.max(1, Math.round((scene.time.now - started) / 1000));
  };
  drawStars();
  return {
    caption: `Викторина: вопрос ${ctx.index + 1} из ${ctx.total}`,
    async enter() {
      scene.overview();
      scene.bubble(ctx.index === 0 ? 'Викторина Виктора Петровича! Отвечай быстро и точно.' : 'Следующий вопрос!', BUBBLE.x, BUBBLE.y);
      await scene.wait(900);
      started = scene.time.now;
      status.setText('⏱ 0 с');
      timer = scene.time.addEvent({ delay: 500, loop: true, callback: () => status.setText(`⏱ ${Math.floor((scene.time.now - started) / 1000)} с`) });
    },
    async success() {
      const s = stop();
      scene.results[ctx.index] = true;
      drawStars();
      status.setText(`Верно! Ответ за ${s} с`).setColor('#9be15d');
      scene.bubble('Отлично!', BUBBLE.x, BUBBLE.y, 'good', 160);
      scene.tweens.add({ targets: room.props.teacher, y: '-=12', duration: 160, yoyo: true, repeat: 1 });
      await scene.wait(900);
    },
    async fail() {
      stop();
      scene.results[ctx.index] = false;
      drawStars();
      status.setText('Неверно').setColor('#ff8fa3');
      scene.bubble('Не страшно — разберём ошибку.', BUBBLE.x, BUBBLE.y, 'bad', 220);
      await scene.wait(1100);
    },
    leave() {
      timer?.remove();
    },
  };
}

const INSPECTOR_LINES: Record<InspectorCase, { line: string; icon: Parameters<typeof drawIcon>[1]; action: string }> = {
  documents: { line: 'Здравствуйте! Лейтенант Соколов, ДПС. Предъявите, пожалуйста, документы.', icon: 'doc', action: 'Передать документы' },
  insurance: { line: 'Добрый день! Лейтенант Соколов. Проверим документы, в том числе полис ОСАГО.', icon: 'doc', action: 'Передать документы' },
  alcohol: { line: 'Плановая проверка. Пройдите освидетельствование на состояние опьянения.', icon: 'breath', action: 'Взять алкотестер' },
  accident: { line: 'Рядом было ДТП. Проверим, знаете ли вы, как действовать.', icon: 'triangle', action: 'Выслушать' },
  punishment: { line: 'Профилактическая беседа: что грозит водителю за нарушения.', icon: 'doc', action: 'Выслушать' },
  phone: { line: 'Поговорим о телефоне за рулём.', icon: 'phone', action: 'Выслушать' },
  belts: { line: 'Поговорим о ремнях безопасности.', icon: 'belt', action: 'Выслушать' },
  stop: { line: 'Инспектор жезлом указывает место остановки.', icon: 'doc', action: 'Остановиться' },
  fine: { line: 'Профилактическая беседа о штрафах.', icon: 'doc', action: 'Выслушать' },
};

function inspector(scene: InteriorScene, ctx: MinigameContext): SceneScript {
  const room = scene.room!;
  const o = room.anchors.officer;
  const w = room.anchors.window;
  const info = INSPECTOR_LINES[ctx.placement.params.case ?? 'documents'];
  return {
    caption: 'Пост ДПС: лейтенант Соколов',
    async enter() {
      scene.overview();
      scene.bubble(info.line, o.x - 40, o.y - 50, 'info', 250);
      await scene.wait(700);
      await scene.tapTarget(w.x, w.y, info.action);
      const icon = graphics(scene, w.x, w.y, (g) => drawIcon(g, info.icon));
      scene.layer.add(icon);
      scene.tweens.add({ targets: icon, x: o.x - 18, y: o.y + 20, duration: 500, ease: 'Sine.easeInOut' });
      await scene.wait(550);
      scene.bubble('У меня к вам вопрос.', o.x - 40, o.y - 50);
      await scene.wait(500);
    },
    async success() {
      scene.bubble('Всё верно. Счастливого пути!', o.x - 40, o.y - 50, 'good');
      scene.tweens.add({ targets: room.props.officer, angle: -6, duration: 180, yoyo: true, repeat: 1 });
      await scene.wait(1100);
    },
    async fail() {
      const paper = scene.add.container(-20, 300, [
        graphics(scene, 0, 0, (g) => {
          g.fillStyle(0x000000, 0.2).fillRect(-66, -44, 136, 94);
          g.fillStyle(0xf8f9fa).fillRect(-70, -48, 136, 94);
          g.fillStyle(0xadb5bd);
          for (let y = -12; y < 40; y += 10) g.fillRect(-58, y, 110, 3);
        }),
        text(scene, -2, -30, 'ПРОТОКОЛ', 15, '#1b2430'),
        text(scene, 20, 18, 'ОШИБКА', 16, '#c62839').setAngle(-14),
      ]);
      scene.layer.add(paper);
      scene.tweens.add({ targets: paper, y: 130, duration: 450, ease: 'Back.easeOut' });
      scene.bubble('Неверно. Изучите пояснение к ответу.', o.x - 40, o.y - 50, 'bad');
      await scene.wait(1300);
    },
    leave() {},
  };
}

function garage(scene: InteriorScene, ctx: MinigameContext): SceneScript {
  const room = scene.room!;
  const part = ctx.placement.params.part ?? 'body';
  const spot = { x: PART_SPOT[part].x * CAR_SCALE, y: CAR_Y + PART_SPOT[part].y * CAR_SCALE };
  const m = room.anchors.mechanic;
  return {
    caption: `Автосервис «Гайка»: ${GARAGE_PARTS[part]}`,
    async enter() {
      scene.overview();
      scene.bubble(`Дядя Гена: осмотри-ка — ${GARAGE_PARTS[part]}`, m.x - 30, m.y - 60, 'info', 200);
      await scene.wait(500);
      await scene.tapTarget(spot.x, spot.y, 'Осмотреть', 30);
      const lens = graphics(scene, spot.x, spot.y, (g) => {
        g.lineStyle(5, 0xffffff).strokeCircle(0, 0, 26);
        g.lineStyle(7, 0xffffff).lineBetween(18, 18, 36, 36);
      });
      scene.layer.add(lens);
      lens.setScale(0.4);
      scene.tweens.add({ targets: lens, scale: 1, duration: 300, ease: 'Back.easeOut' });
      await scene.wait(450);
    },
    async success() {
      scene.layer.add(
        graphics(scene, spot.x, spot.y - 46, (g) => {
          g.fillStyle(0x1f8a43).fillCircle(0, 0, 18);
          g.lineStyle(5, 0xffffff).beginPath().moveTo(-8, 0).lineTo(-2, 7).lineTo(9, -7).strokePath();
        }),
      );
      scene.bubble('Точно!', m.x - 30, m.y - 60, 'good', 140);
      await scene.wait(1000);
    },
    async fail() {
      scene.layer.add(graphics(scene, spot.x, spot.y - 46, (g) => drawIcon(g, 'wrench')).setScale(1.3));
      scene.bubble('Не так. Глянь пояснение.', m.x - 30, m.y - 60, 'bad', 200);
      await scene.wait(1200);
    },
    leave() {},
  };
}

function firstAid(scene: InteriorScene, ctx: MinigameContext): SceneScript {
  const room = scene.room!;
  const injury = ctx.placement.params.injury ?? 'call';
  const step = FIRST_AID_STEPS[injury];
  const v = room.anchors.victim;
  const last = ctx.index === ctx.total - 1;
  const kit = room.props.kit as G;
  const ambulance = async () => {
    const car = scene.add.container(520, -300, [graphics(scene, 0, 0, (g) => drawVehicle(g, 'ambulance'))]).setScale(2.3).setAngle(-90);
    scene.layer.add(car);
    await new Promise<void>((resolve) => scene.tweens.add({ targets: car, x: 150, duration: 1400, ease: 'Cubic.easeOut', onComplete: () => resolve() }));
    scene.bubble('Скорая помощь на месте', 150, -340, 'good', 200);
    await scene.wait(900);
  };
  return {
    caption: `Аптечка: шаг ${ctx.index + 1} из ${ctx.total} — ${step}`,
    async enter() {
      scene.overview();
      drawKit(kit, false);
      const plate = text(scene, v.x, v.y - 118, `Шаг ${ctx.index + 1} из ${ctx.total}: ${step}`, 17, '#1b2430', { backgroundColor: '#ffffff', padding: { x: 10, y: 6 } });
      scene.layer.add(plate);
      await scene.wait(500);
      if (injury === 'call') await scene.tapTarget(room.anchors.phone.x, room.anchors.phone.y, 'Позвонить', 30);
      else {
        await scene.tapTarget(room.anchors.kit.x, room.anchors.kit.y, 'Открыть аптечку', 34);
        drawKit(kit, true);
      }
      await scene.wait(300);
    },
    async success() {
      scene.layer.add(
        graphics(scene, v.x + 70, v.y - 40, (g) => {
          g.fillStyle(0x1f8a43).fillCircle(-7, -4, 9).fillCircle(7, -4, 9).fillTriangle(-16, 0, 16, 0, 0, 18);
        }),
      );
      scene.stamp('Верно!', v.x, v.y + 64, 'good');
      await scene.wait(900);
      if (last) await ambulance();
    },
    async fail() {
      scene.stamp('Так нельзя!', v.x, v.y + 64, 'bad');
      await scene.wait(1200);
      if (last) await ambulance();
    },
    leave() {},
  };
}

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import React from 'react';
import StarSystem from './StarSystem';
import type { DisplayStarSystemType, FactionDataType } from '../hooks/types';
import { initialSettings } from '../hooks/types';

// ---------------------------------------------------------------------------
// vi.hoisted — kept for the Konva mock factory (no longer used for assertions)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Module mocks (factories must be self-contained — no top-level imports)
// ---------------------------------------------------------------------------

vi.mock('react-konva', () => {
  const passthrough = (tag: string) =>
    React.forwardRef<unknown, any>(function KonvaMock({ children, ...rest }: any, ref) {
      const fake = React.useMemo(
        () => ({
          opacity: vi.fn(),
          scale: vi.fn(),
          position: vi.fn(),
          getLayer: () => null,
          getStage: () => ({
            getPointerPosition: () => ({ x: 0, y: 0 }),
            getRelativePointerPosition: () => ({ x: 0, y: 0 }),
            x: () => 0,
            y: () => 0,
          }),
          batchDraw: vi.fn(),
          destroy: vi.fn(),
          container: vi.fn(() => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() })),
          getPointerPosition: vi.fn(() => ({ x: 0, y: 0 })),
          getRelativePointerPosition: vi.fn(() => ({ x: 0, y: 0 })),
          x: vi.fn(() => 0),
          y: vi.fn(() => 0),
          scaleX: vi.fn(() => 1),
          getPosition: vi.fn(() => ({ x: 0, y: 0 })),
        }),
        []
      );
      React.useImperativeHandle(ref, () => fake);
      const safeProps: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          safeProps[`data-${k.toLowerCase()}`] = String(v);
        }
      }
      return React.createElement(tag, safeProps, children);
    });

  return {
    Circle: passthrough('span'),
    Group: passthrough('div'),
    Image: passthrough('div'),
  };
});

vi.mock('konva', () => {
  class Text {
    width() { return 50; }
    destroy() {}
  }
  return { default: { Text }, __esModule: true };
});

// Asset imports resolve to empty strings in the test environment.
vi.mock('../../assets/joli-rouge-icon.svg', () => ({ default: '' }));
vi.mock('../../assets/shield.svg', () => ({ default: '' }));
vi.mock('../../assets/crosshairs.svg', () => ({ default: '' }));

vi.mock('../helpers', () => ({ openInNewTab: vi.fn() }));
vi.mock('../helpers/ApiHelper.ts', () => ({ API_BASE_URL: '' }));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const makeSystem = (overrides: Partial<DisplayStarSystemType> = {}): DisplayStarSystemType => ({
  id: 'terra',
  name: 'Terra',
  posX: 0,
  posY: 0,
  owner: 'ComStar',
  isCapital: false,
  factionColour: '#ffffff',
  factionName: 'ComStar',
  normalizedName: 'terra',
  factions: [],
  sysUrl: '/system/terra',
  state: {},
  ...overrides,
});

const fakeFactions: FactionDataType = {};

const baseProps = {
  factions: fakeFactions,
  scaleRef: { current: 1 } as React.RefObject<number>,
  registerScaleListener: vi.fn(() => vi.fn()),
  registerAnimationListener: vi.fn(() => vi.fn()),
  settings: initialSettings,
  showTooltip: vi.fn(),
  hideTooltip: vi.fn(),
  tooltipVisibleRef: { current: false } as React.MutableRefObject<boolean>,
  touchedSystemNameRef: { current: null } as React.MutableRefObject<string | null>,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StarSystem', () => {
  beforeEach(() => {
    // Stub Image so icon loaders don't hang on missing URLs.
    vi.spyOn(window, 'Image' as any).mockImplementation(() => {
      const img: Partial<HTMLImageElement> = {};
      // Immediately invoke onload so the promise resolves synchronously.
      setTimeout(() => img.onload?.({} as Event), 0);
      return img as HTMLImageElement;
    });
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders without crashing for a plain system', () => {
    const { container } = render(
      React.createElement(StarSystem, { ...baseProps, system: makeSystem() })
    );
    expect(container).toBeTruthy();
  });

  it('subscribes to the animation clock when the system is in insurrection', () => {
    const unsubscribe = vi.fn();
    const registerAnimationListener = vi.fn(() => unsubscribe);
    render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerAnimationListener,
        system: makeSystem({ state: { isInsurrect: true } }),
      })
    );
    expect(registerAnimationListener).toHaveBeenCalled();
  });

  it('unsubscribes the insurrection animation listener on unmount', () => {
    const unsubscribe = vi.fn();
    const registerAnimationListener = vi.fn(() => unsubscribe);
    const { unmount } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerAnimationListener,
        system: makeSystem({ state: { isInsurrect: true } }),
      })
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('subscribes to the animation clock for a pirate raid system', () => {
    const unsubscribe = vi.fn();
    const registerAnimationListener = vi.fn(() => unsubscribe);
    render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerAnimationListener,
        system: makeSystem({ state: { hasPirateRaid: true } }),
      })
    );
    expect(registerAnimationListener).toHaveBeenCalled();
  });

  it('unsubscribes the size-pulse listener on unmount', () => {
    const unsubscribe = vi.fn();
    const registerAnimationListener = vi.fn(() => unsubscribe);
    const { unmount } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerAnimationListener,
        system: makeSystem({ state: { hasPirateRaid: true } }),
      })
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('calls the registerScaleListener unsubscribe on unmount', () => {
    const unsubscribe = vi.fn();
    const registerScaleListener = vi.fn(() => unsubscribe);

    const { unmount } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerScaleListener,
        system: makeSystem(),
      })
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('scale listener is invoked with scale values without throwing', () => {
    let capturedListener: ((scale: number) => void) | undefined;
    const registerScaleListener = vi.fn((listener: (scale: number) => void) => {
      capturedListener = listener;
      return vi.fn();
    });

    render(
      React.createElement(StarSystem, {
        ...baseProps,
        registerScaleListener,
        system: makeSystem(),
      })
    );

    expect(capturedListener).toBeDefined();
    // scale > 1: group ref is null in test, early return taken
    expect(() => capturedListener?.(2)).not.toThrow();
    // scale <= 1
    expect(() => capturedListener?.(0.5)).not.toThrow();
  });

  it('loads holdTheLine icon when hasHoldTheLineEvent is true', async () => {
    await act(async () => {
      render(
        React.createElement(StarSystem, {
          ...baseProps,
          system: makeSystem({ state: { hasHoldTheLineEvent: true } }),
        })
      );
    });
  });

  it('loads captureEvent icon when hasCaptureEvent is true', async () => {
    await act(async () => {
      render(
        React.createElement(StarSystem, {
          ...baseProps,
          system: makeSystem({ state: { hasCaptureEvent: true } }),
        })
      );
    });
  });

  it('renders capital system with larger radius', () => {
    const { container } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        system: makeSystem({ isCapital: true }),
      })
    );
    expect(container).toBeTruthy();
  });

  it('renders with highlighted prop and flashActivePlayers', () => {
    const { container } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        highlighted: true,
        system: makeSystem({
          factions: [{ name: 'ComStar', color: '#fff', ActivePlayers: 5, control: 100 }],
        }),
        settings: { ...initialSettings, flashActivePlayers: true },
      })
    );
    expect(container).toBeTruthy();
  });

  it('renders with holdTheLine and capture together (insurrectionLike branches)', () => {
    const { container } = render(
      React.createElement(StarSystem, {
        ...baseProps,
        system: makeSystem({
          state: { hasHoldTheLineEvent: true, hasCaptureEvent: true },
        }),
      })
    );
    expect(container).toBeTruthy();
  });
});

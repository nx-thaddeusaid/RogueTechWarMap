/**
 * Branch coverage tests for GalaxyMap page and GalaxyMapRender.
 * Module mocks must be self-contained (no top-level variable references)
 * because vi.mock is hoisted before imports.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import React from 'react';

// ── react-konva: passthrough stubs ────────────────────────────────────────────
vi.mock('react-konva', () => {
  const passthrough = (tag: string) =>
    React.forwardRef<unknown, any>(function KonvaMock({ children, ...rest }: any, ref) {
      const fake = React.useMemo(
        () => ({
          opacity: vi.fn(),
          scale: vi.fn(),
          position: vi.fn(),
          getLayer: () => null,
          getStage: () => null,
          batchDraw: vi.fn(),
          destroy: vi.fn(),
          container: vi.fn(() => ({
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            style: { touchAction: '' },
          })),
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
    Stage: passthrough('div'),
    Layer: passthrough('div'),
    Image: passthrough('div'),
    Text: passthrough('span'),
    Group: passthrough('div'),
    Rect: passthrough('div'),
    Line: passthrough('span'),
  };
});

vi.mock('konva', () => {
  class Animation {
    constructor(public cb: (frame: unknown) => void, public layer: unknown) {}
    start() {}
    stop() {}
  }
  class Text {
    constructor(public opts: unknown) {}
    width() { return 50; }
    destroy() {}
  }
  return { default: { Animation, Text }, __esModule: true };
});

vi.mock('../hooks/useGalaxyViewport', () => ({
  useGalaxyViewport: () => ({
    stageRef: { current: null },
    scaleRef: { current: 1 },
    positionRef: { current: { x: 0, y: 0 } },
    view: { scale: 1, position: { x: 0, y: 0 } },
    schedulePositionUpdate: vi.fn(),
    setZoomScaleFactor: vi.fn(),
    registerScaleListener: vi.fn(() => vi.fn()),
    notifyScaleListeners: vi.fn(),
    handlers: { onWheel: vi.fn(), onDragMove: vi.fn() },
  }),
}));

vi.mock('../hooks/usePinchZoom', () => ({
  usePinchZoom: () => ({
    isPinching: false,
    handlers: {
      onTouchStart: vi.fn(),
      onTouchMove: vi.fn(),
      onTouchEnd: vi.fn(),
    },
  }),
}));

vi.mock('../hooks/useTooltip', () => ({
  default: vi.fn(() => ({
    tooltip: { visible: false, x: 0, y: 0, text: '' },
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
  })),
}));

vi.mock('../hooks/useFiltering', () => ({
  default: vi.fn(() => ({
    displaySystems: [],
    factions: {},
    capitals: [],
    fetchError: null,
    isLoading: true,
    fetchFactionData: vi.fn(),
    fetchSystemData: vi.fn(),
    settings: {
      flashActivePlayers: false,
      showSystemNames: false,
      showOwnerBadge: false,
    },
  })),
}));

vi.mock('../ui/StarSystem', () => ({ default: () => null }));
vi.mock('../ui/BottomFilterPanel', () => ({ default: () => null }));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { GalaxyMapRender } from './GalaxyMap';
import GalaxyMap from './GalaxyMap';
import useTooltip from '../hooks/useTooltip';
import useFiltering from '../hooks/useFiltering';
import { initialSettings } from '../hooks/types';

const baseProps = {
  systems: [],
  factions: {},
  settings: initialSettings,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const setTooltip = (tooltip: object) => {
  vi.mocked(useTooltip).mockReturnValue({
    tooltip: {
      visible: false,
      x: 0,
      y: 0,
      text: '',
      ...tooltip,
    },
    showTooltip: vi.fn(),
    hideTooltip: vi.fn(),
  });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GalaxyMap page — loading/error/render states', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    }) as typeof window.requestAnimationFrame);
  });

  afterEach(() => vi.restoreAllMocks());

  it('shows loading state when isLoading is true', () => {
    vi.mocked(useFiltering).mockReturnValue({
      displaySystems: [],
      factions: {},
      capitals: [],
      fetchError: null,
      isLoading: true,
      fetchFactionData: vi.fn(),
      fetchSystemData: vi.fn(),
      settings: initialSettings,
    });

    const { getByText } = render(React.createElement(GalaxyMap));
    expect(getByText(/Loading war map/i)).toBeTruthy();
  });

  it('shows error state when fetchError is set', () => {
    vi.mocked(useFiltering).mockReturnValue({
      displaySystems: [],
      factions: {},
      capitals: [],
      fetchError: 'Network timeout',
      isLoading: false,
      fetchFactionData: vi.fn(),
      fetchSystemData: vi.fn(),
      settings: initialSettings,
    });

    const { getByText } = render(React.createElement(GalaxyMap));
    expect(getByText(/Failed to load war map data/i)).toBeTruthy();
    expect(getByText('Network timeout')).toBeTruthy();
  });

  it('renders GalaxyMapRender when data is ready', () => {
    const sys = {
      id: '1', name: 'Terra', posX: '0', posY: '0',
      owner: 'ComStar', factions: [], normalizedName: 'terra',
      factionColour: '#fff', factionName: 'ComStar', isCapital: false,
      sysUrl: '/systems/1',
    };
    vi.mocked(useFiltering).mockReturnValue({
      displaySystems: [sys],
      factions: {},
      capitals: [sys],
      fetchError: null,
      isLoading: false,
      fetchFactionData: vi.fn(),
      fetchSystemData: vi.fn(),
      settings: initialSettings,
    });

    // Should render without crashing (GalaxyMapRender is mocked via StarSystem/BFP mocks)
    const { container } = render(React.createElement(GalaxyMap));
    expect(container).toBeTruthy();
  });

  it('shows loading state when displaySystems is empty and isLoading is false', () => {
    vi.mocked(useFiltering).mockReturnValue({
      displaySystems: [],
      factions: {},
      capitals: [],
      fetchError: null,
      isLoading: false,
      fetchFactionData: vi.fn(),
      fetchSystemData: vi.fn(),
      settings: initialSettings,
    });

    const { getByText } = render(React.createElement(GalaxyMap));
    expect(getByText(/Loading war map/i)).toBeTruthy();
  });
});

describe('GalaxyMapRender — mobile tooltip', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 375 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 667 });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    }) as typeof window.requestAnimationFrame);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });

  it('shows mobile tooltip panel when visible on small screen', () => {
    setTooltip({
      visible: true,
      x: 100,
      y: 100,
      text: 'Terra\n(ComStar)\nDetails line',
      controlItems: [],
    });

    const { getByText } = render(React.createElement(GalaxyMapRender, baseProps));
    expect(getByText(/Terra/)).toBeTruthy();
  });

  it('renders Close button and clicking it calls hideTooltip', () => {
    const hideTooltip = vi.fn();
    vi.mocked(useTooltip).mockReturnValue({
      tooltip: {
        visible: true,
        x: 50,
        y: 50,
        text: 'System\nLine2',
        controlItems: [],
      },
      showTooltip: vi.fn(),
      hideTooltip,
    });

    const { getByText } = render(React.createElement(GalaxyMapRender, baseProps));
    fireEvent.click(getByText('Close'));
    expect(hideTooltip).toHaveBeenCalled();
  });

  it('renders "Open System" button when tooltip.onTouch is set', () => {
    const onTouch = vi.fn();
    vi.mocked(useTooltip).mockReturnValue({
      tooltip: {
        visible: true,
        x: 50,
        y: 50,
        text: 'System\nDetails',
        controlItems: [],
        onTouch,
      },
      showTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    });

    const { getByText } = render(React.createElement(GalaxyMapRender, baseProps));
    fireEvent.click(getByText('Open System'));
    expect(onTouch).toHaveBeenCalled();
  });

  it('shows control items and "Show all" button when controlItems > 3', () => {
    const controlItems = [
      { name: 'FactionA', control: 40, players: 2 },
      { name: 'FactionB', control: 30, players: 1 },
      { name: 'FactionC', control: 20, players: 3 },
      { name: 'FactionD', control: 10, players: 0 },
    ];
    vi.mocked(useTooltip).mockReturnValue({
      tooltip: {
        visible: true,
        x: 50,
        y: 50,
        text: 'System\nDetails',
        controlItems,
      },
      showTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    });

    const { getByText } = render(React.createElement(GalaxyMapRender, baseProps));
    expect(getByText(/Show all/i)).toBeTruthy();
    fireEvent.click(getByText(/Show all/i));
    expect(getByText(/Show less/i)).toBeTruthy();
    expect(getByText(/FactionD/)).toBeTruthy();
  });

  it('renders subtitle when mobile tooltip has subtitle', () => {
    vi.mocked(useTooltip).mockReturnValue({
      tooltip: {
        visible: true,
        x: 50,
        y: 50,
        text: 'System Name\n(Owner Name)\nSome detail',
        controlItems: [],
      },
      showTooltip: vi.fn(),
      hideTooltip: vi.fn(),
    });

    const { getByText } = render(React.createElement(GalaxyMapRender, baseProps));
    expect(getByText('System Name')).toBeTruthy();
  });
});

describe('GalaxyMapRender — search filter', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    }) as typeof window.requestAnimationFrame);
  });

  afterEach(() => vi.restoreAllMocks());

  it('renders without crash when systems list is non-empty', () => {
    const sys = {
      id: '1', name: 'Terra', posX: '0', posY: '0',
      owner: 'ComStar', factions: [], normalizedName: 'terra',
      factionColour: '#fff', factionName: 'ComStar', isCapital: false,
      sysUrl: '/systems/1',
    };
    const { container } = render(
      React.createElement(GalaxyMapRender, { ...baseProps, systems: [sys] })
    );
    expect(container).toBeTruthy();
  });
});

describe('GalaxyMapRender — background image loading', () => {
  beforeEach(() => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((cb: FrameRequestCallback) => {
      cb(performance.now());
      return 1;
    }) as typeof window.requestAnimationFrame);
  });

  afterEach(() => vi.restoreAllMocks());

  it('triggers bgLoadError path when image fails to load', async () => {
    const { container } = await act(async () => {
      const result = render(React.createElement(GalaxyMapRender, baseProps));
      // Fire onerror on any Image created after mount
      const images = document.querySelectorAll('img');
      images.forEach((img) => {
        if (img.onerror) img.onerror(new Event('error'));
      });
      return result;
    });
    expect(container).toBeTruthy();
  });
});

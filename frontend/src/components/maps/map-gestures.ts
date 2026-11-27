import { PanResponder, type GestureResponderEvent } from 'react-native';
import { clamp, tileSize, type Camera } from './mercator';

function touchDistance(
  touches: GestureResponderEvent['nativeEvent']['touches'],
) {
  const [left, right] = touches ?? [];
  return left && right
    ? Math.hypot(left.pageX - right.pageX, left.pageY - right.pageY)
    : 0;
}

export function createMapGestures(
  initial: Camera,
  onMove: (camera: Camera) => void,
) {
  let current = initial;
  let start: { camera: Camera; distance: number } | null = null;
  let moved = false;
  const responder = PanResponder.create({
    onMoveShouldSetPanResponder: (event, state) =>
      touchDistance(event.nativeEvent.touches) > 0 ||
      Math.abs(state.dx) > 7 ||
      Math.abs(state.dy) > 7,
    onPanResponderGrant: (event) => {
      start = {
        camera: current,
        distance: touchDistance(event.nativeEvent.touches),
      };
      moved = true;
    },
    onPanResponderMove: (event, movement) => {
      if (!start) return;
      const distance = touchDistance(event.nativeEvent.touches);
      if (start.distance === 0 && distance > 0) start.distance = distance;
      const zoom =
        distance && start.distance
          ? clamp(
              start.camera.zoom +
                Math.round(Math.log2(distance / start.distance)),
              3,
              19,
            )
          : start.camera.zoom;
      const pixels = 2 ** zoom * tileSize;
      onMove({
        zoom,
        center: {
          x: clamp(start.camera.center.x - movement.dx / pixels, 0, 1),
          y: clamp(start.camera.center.y - movement.dy / pixels, 0, 1),
        },
      });
    },
    onPanResponderRelease: () => {
      start = null;
    },
    onPanResponderTerminate: () => {
      start = null;
    },
  });
  return {
    panHandlers: responder.panHandlers,
    setActive(camera: Camera) {
      current = camera;
    },
    resetDrag() {
      moved = false;
    },
    didDrag() {
      return moved;
    },
  };
}

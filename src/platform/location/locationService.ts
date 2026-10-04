import * as Location from 'expo-location';

export type TaskCoordinates = { latitude: number; longitude: number };

export async function getCurrentTaskCoordinates(): Promise<TaskCoordinates | null> {
  let permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) return null;
    permission = await Location.requestForegroundPermissionsAsync();
  }

  if (!permission.granted || !(await Location.hasServicesEnabledAsync())) return null;

  const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 15 * 60 * 1000, requiredAccuracy: 2000 });
  if (lastKnown) {
    return {
      latitude: lastKnown.coords.latitude,
      longitude: lastKnown.coords.longitude,
    };
  }

  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

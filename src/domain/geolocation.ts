export type CurrentLocation = { latitude: number; longitude: number; accuracy: number };

export function geolocationErrorMessage(error?: Pick<GeolocationPositionError, "code">): string {
  if (!error) return "このブラウザでは位置情報を利用できません。手動で位置を指定できます。";
  if (error.code === 1) return "位置情報の利用が許可されませんでした。手動で位置を指定できます。";
  if (error.code === 3) return "現在地の取得がタイムアウトしました。再試行するか、手動で位置を指定できます。";
  return "現在地を取得できませんでした。再試行するか、手動で位置を指定できます。";
}

export function requestCurrentLocation(): Promise<CurrentLocation> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return reject(new Error(geolocationErrorMessage()));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }),
      (error) => reject(new Error(geolocationErrorMessage(error))),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  });
}

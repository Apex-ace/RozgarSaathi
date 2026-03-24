export function getCurrentPositionAsync(options = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

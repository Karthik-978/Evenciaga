export const getCurrentDeviceLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          "Location services are not supported by this browser."
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        let message =
          "Unable to detect your location.";

        switch (error.code) {
          case error.PERMISSION_DENIED:
            message =
              "Location permission was denied. Please allow location access in your browser.";
            break;

          case error.POSITION_UNAVAILABLE:
            message =
              "Your current location could not be determined.";
            break;

          case error.TIMEOUT:
            message =
              "Location detection timed out. Please try again.";
            break;

          default:
            message =
              "Unable to detect your current location.";
        }

        reject(new Error(message));
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  });
};


export const reverseGeocodeLocation = async (
  latitude,
  longitude
) => {
  const url =
    `https://nominatim.openstreetmap.org/reverse` +
    `?format=jsonv2` +
    `&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    `&zoom=18` +
    `&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      "Unable to convert your coordinates into an address."
    );
  }

  const data = await response.json();

  if (!data?.display_name) {
    throw new Error(
      "No readable address was found for this location."
    );
  }

  return {
    formattedAddress: data.display_name,
    address: data.address || {},
  };
};


export const getGoogleMapsUrl = (
  latitude,
  longitude
) => {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${latitude},${longitude}`
  )}`;
};
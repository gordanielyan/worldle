import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import {
  areas,
  bigEnoughCountriesWithImage,
  countriesWithImage,
  Country,
  smallCountryLimit,
} from "../domain/countries";
import {
  clearGuessesStorage,
  Guess,
  loadAllGuesses,
  saveGuesses,
} from "../domain/guess";

const forcedCountries: Record<string, string> = {
  "2022-02-02": "TD",
  "2022-02-03": "PY",
  "2022-03-21": "HM",
  "2022-03-22": "MC",
  "2022-03-23": "PR",
  "2022-03-24": "MX",
};

export function getDayString(shiftDayCount?: number) {
  return DateTime.now()
    .plus({ days: shiftDayCount ?? 0 })
    .toFormat("yyyy-MM-dd");
}

export function useTodays(dayString: string): [
  {
    country?: Country;
    guesses: Guess[];
  },
  (guess: Guess) => void,
  () => void,
  number,
  number
] {
  const [todays, setTodays] = useState<{
    country?: Country;
    guesses: Guess[];
  }>({ guesses: [] });

  const clearGuesses = () => {
    clearGuessesStorage();
    setTodays({
      ...todays,
      guesses: [],
    });
  };

  const addGuess = useCallback(
    (newGuess: Guess) => {
      if (todays == null) {
        return;
      }

      const newGuesses = [...todays.guesses, newGuess];

      setTodays((prev) => ({ country: prev.country, guesses: newGuesses }));
      saveGuesses(dayString, newGuesses);
    },
    [dayString, todays]
  );

  useEffect(() => {
    const guesses = loadAllGuesses()[dayString] ?? [];
    const country = getCountry(dayString);

    setTodays({ country, guesses });
  }, [dayString]);

  const randomAngle = useMemo(
    () => seedrandom.alea(dayString)() * 360,
    [dayString]
  );

  const imageScale = useMemo(() => {
    const normalizedAngle = 45 - (randomAngle % 90);
    const radianAngle = (normalizedAngle * Math.PI) / 180;
    return 1 / (Math.cos(radianAngle) * Math.sqrt(2));
  }, [randomAngle]);

  return [todays, addGuess, clearGuesses, randomAngle, imageScale];
}

function pickRandomCountry() {
  const countrySelection = [
    ...countriesWithImage,
    ...bigEnoughCountriesWithImage,
  ];
  return countrySelection[
    Math.floor(
      seedrandom.alea(DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"))() *
        countrySelection.length
    )
  ];
}

export function useGetCountry() {
  const [country, setCountry] = useState<Country>(pickRandomCountry());
  const generateNewCountry = () => {
    const newCountry = pickRandomCountry();
    setCountry(newCountry);
    localStorage.setItem("country", JSON.stringify(newCountry));
  };
  const storedCountry = localStorage.getItem("country");
  if (storedCountry) {
    return [JSON.parse(storedCountry), generateNewCountry];
  }
  localStorage.setItem("country", JSON.stringify(country));
  return [country, generateNewCountry];
}

function getCountry(dayString: string) {
  const currentDayDate = DateTime.fromFormat(dayString, "yyyy-MM-dd");
  let pickingDate = DateTime.fromFormat("2022-03-21", "yyyy-MM-dd");
  let smallCountryCooldown = 0;
  let pickedCountry: Country | null = null;

  do {
    smallCountryCooldown--;

    const pickingDateString = pickingDate.toFormat("yyyy-MM-dd");

    const forcedCountryCode = forcedCountries[dayString];
    const forcedCountry =
      forcedCountryCode != null
        ? countriesWithImage.find(
            (country) => country.code === forcedCountryCode
          )
        : undefined;

    const countrySelection =
      smallCountryCooldown < 0
        ? countriesWithImage
        : bigEnoughCountriesWithImage;

    pickedCountry =
      forcedCountry ??
      countrySelection[
        Math.floor(
          seedrandom.alea(pickingDateString)() * countrySelection.length
        )
      ];

    if (areas[pickedCountry.code] < smallCountryLimit) {
      smallCountryCooldown = 7;
    }

    pickingDate = pickingDate.plus({ day: 1 });
  } while (pickingDate <= currentDayDate);

  return pickedCountry;
}

import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useState } from "react";
import seedrandom from "seedrandom";
import {
  // areas,
  bigEnoughCountriesWithImage,
  countriesWithImage,
  Country,
  smallCountryLimit,
} from "../domain/countries";
import { areas } from "../domain/countries.area";
// import { Guess, loadAllGuesses, saveGuesses } from "../domain/guess";
import {
  clearFreeGuessesStorage,
  Guess,
  loadAllGuesses,
  saveGuesses,
} from "../domain/guess";
import { GameMode } from "../components/Game";

const forcedCountries: Record<string, string> = {
  "2022-02-02": "TD",
  "2022-02-03": "PY",
  "2022-03-21": "HM",
  "2022-03-22": "MC",
  "2022-03-23": "PR",
  "2022-03-24": "MX",
};

const noRepeatStartDate = DateTime.fromFormat("2022-05-01", "yyyy-MM-dd");

export function getDayString(shiftDayCount?: number) {
  return DateTime.now()
    .plus({ days: shiftDayCount ?? 0 })
    .toFormat("yyyy-MM-dd");
}

export function useCurrent(
  mode: GameMode,
  dayString: string
): {
  country: Country;
  guesses: Guess[];
  generateNewCountry: () => void;
  addGuess: (guess: Guess) => void;
  clearGuesses: () => void;
  randomAngle: number;
  imageScale: number;
} {
  const {
    country: dailyCountry,
    guesses: dailyGuesses,
    addGuess: addDailyGuess,
    randomAngle: dailyRandomAngle,
    imageScale: dailyImageScale,
  } = useTodays(dayString);

  const generateNewDailyCountry = useCallback(() => {
    console.warn("cannot generate new daily country");
  }, []);

  const clearDailyGuesses = useCallback(() => {
    console.warn("cannot clear daily guesses");
  }, []);

  const {
    country: freeCountry,
    guesses: freeGuesses,
    generateNewCountry: generateNewFreeCountry,
    addGuess: addFreeGuess,
    clearGuesses: clearFreeGuesses,
    randomAngle: freeRandomAngle,
    imageScale: freeImageScale,
  } = useFreePlay();

  const country = useMemo(
    () => (mode === "free" ? freeCountry : dailyCountry),
    [mode, freeCountry, dailyCountry]
  );

  const guesses = useMemo(
    () => (mode === "free" ? freeGuesses : dailyGuesses),
    [mode, freeGuesses, dailyGuesses]
  );

  const addGuess = useMemo(
    () => (mode === "free" ? addFreeGuess : addDailyGuess),
    [mode, addDailyGuess, addFreeGuess]
  );

  const randomAngle = useMemo(
    () => (mode === "free" ? freeRandomAngle : dailyRandomAngle),
    [mode, freeRandomAngle, dailyRandomAngle]
  );

  const imageScale = useMemo(
    () => (mode === "free" ? freeImageScale : dailyImageScale),
    [mode, freeImageScale, dailyImageScale]
  );

  const generateNewCountry = useMemo(
    () => (mode === "free" ? generateNewFreeCountry : generateNewDailyCountry),
    [mode, generateNewFreeCountry, generateNewDailyCountry]
  );

  const clearGuesses = useMemo(
    () => (mode === "free" ? clearFreeGuesses : clearDailyGuesses),
    [mode, clearFreeGuesses, clearDailyGuesses]
  );

  return {
    country,
    guesses,
    generateNewCountry,
    addGuess,
    clearGuesses,
    randomAngle,
    imageScale,
  };
}

export function useTodays(dayString: string): {
  country: Country;
  guesses: Guess[];
  addGuess: (guess: Guess) => void;
  randomAngle: number;
  imageScale: number;
} {
  const [country, setCountry] = useState<Country>(getCountry(dayString));
  const [guesses, setGuesses] = useState<Guess[]>(
    loadAllGuesses()[dayString] ?? []
  );

  const addGuess = useCallback(
    (newGuess: Guess) => {
      if (guesses == null || newGuess == null) {
        return;
      }

      const newGuesses = [...guesses, newGuess];

      setGuesses(newGuesses);
      saveGuesses(dayString, newGuesses);
    },
    [dayString, guesses]
  );

  useEffect(() => {
    setCountry(getCountry(dayString));
    setGuesses(loadAllGuesses()[dayString] ?? []);
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

  return {
    country,
    guesses,
    addGuess,
    randomAngle,
    imageScale,
  };
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

export function useFreePlay(): {
  country: Country;
  guesses: Guess[];
  generateNewCountry: () => void;
  addGuess: (guess: Guess) => void;
  clearGuesses: () => void;
  randomAngle: number;
  imageScale: number;
} {
  const storedCountry = localStorage.getItem("country");
  const [country, setCountry] = useState<Country>(
    storedCountry ? JSON.parse(storedCountry) : pickRandomCountry()
  );
  const [guesses, setGuesses] = useState<Guess[]>(
    storedCountry ? loadAllGuesses()["free"] ?? [] : []
  );

  if (!storedCountry) {
    localStorage.setItem("country", JSON.stringify(country));
  }

  const generateNewCountry = () => {
    const newCountry = pickRandomCountry();
    localStorage.setItem("country", JSON.stringify(newCountry));
    setCountry(newCountry);
  };

  const clearGuesses = () => {
    clearFreeGuessesStorage();
    setGuesses([]);
  };

  const addGuess = (newGuess: Guess) => {
    if (guesses == null || newGuess == null) {
      return;
    }

    const newGuesses = [...guesses, newGuess];

    setGuesses(newGuesses);
    saveGuesses("free", newGuesses);
  };

  const randomAngle =
    seedrandom.alea(DateTime.now().toFormat("yyyy-MM-dd HH:mm:ss.SSS"))() * 360;

  const normalizedAngle = 45 - (randomAngle % 90);
  const radianAngle = (normalizedAngle * Math.PI) / 180;
  const imageScale = 1 / (Math.cos(radianAngle) * Math.sqrt(2));

  return {
    country,
    guesses,
    generateNewCountry,
    addGuess,
    clearGuesses,
    randomAngle,
    imageScale,
  };
}

function getCountry(dayString: string) {
  const currentDayDate = DateTime.fromFormat(dayString, "yyyy-MM-dd");
  let pickingDate = DateTime.fromFormat("2022-03-21", "yyyy-MM-dd");
  let smallCountryCooldown = 0;
  let pickedCountry: Country | null = null;

  const lastPickDates: Record<string, DateTime> = {};

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

    if (forcedCountry != null) {
      pickedCountry = forcedCountry;
    } else {
      let countryIndex = Math.floor(
        seedrandom.alea(pickingDateString)() * countrySelection.length
      );
      pickedCountry = countrySelection[countryIndex];

      if (currentDayDate >= noRepeatStartDate) {
        while (isARepeat(pickedCountry, lastPickDates, currentDayDate)) {
          countryIndex = (countryIndex + 1) % countrySelection.length;
          pickedCountry = countrySelection[countryIndex];
        }
      }
    }

    if (areas[pickedCountry.code] < smallCountryLimit) {
      smallCountryCooldown = 7;
    }

    lastPickDates[pickedCountry.code] = pickingDate;
    pickingDate = pickingDate.plus({ day: 1 });
  } while (pickingDate <= currentDayDate);

  return pickedCountry;
}

function isARepeat(
  pickedCountry: Country | null,
  lastPickDates: Record<string, DateTime>,
  currentDayDate: DateTime
) {
  if (pickedCountry == null || lastPickDates[pickedCountry.code] == null) {
    return false;
  }
  const daysSinceLastPick = lastPickDates[pickedCountry.code].diff(
    currentDayDate,
    "day"
  ).days;

  return daysSinceLastPick < 100;
}

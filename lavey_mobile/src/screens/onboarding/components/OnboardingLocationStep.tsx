import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as Location from "expo-location";
import { theme } from "../../../constants/theme";
import type { OnboardingLocationInput } from "../../../types";
import { fetchCitiesForCountry, fetchCountries } from "../../../utils/geoApi";
import { LocationSelectField } from "./LocationSelectField";
import { UnderlineTextInput } from "./FormUnderline";

function TapText({
  label,
  onPress,
  disabled,
  loading,
}: {
  label: string;
  onPress(): void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <Pressable
      style={styles.linkButton}
      onPress={onPress}
      disabled={disabled}
      hitSlop={10}
    >
      {loading ? (
        <ActivityIndicator color="#303034" />
      ) : (
        <Text style={styles.primaryLinkText}>{label}</Text>
      )}
    </Pressable>
  );
}

type Status = "idle" | "requesting" | "granted" | "denied";

function ManualLocationPicker({
  t,
  manualCountry,
  manualTown,
  countries,
  countriesLoading,
  countriesFailed,
  cities,
  citiesLoading,
  townFallback,
  resolving,
  onCountrySelect,
  onTownSelect,
  onTownTextChange,
  onSubmit,
}: {
  t(english: string): string;
  manualCountry: string;
  manualTown: string;
  countries: string[];
  countriesLoading: boolean;
  countriesFailed: boolean;
  cities: string[];
  citiesLoading: boolean;
  townFallback: boolean;
  resolving: boolean;
  onCountrySelect(country: string): void;
  onTownSelect(town: string): void;
  onTownTextChange(town: string): void;
  onSubmit(): void;
}) {
  return (
    <View style={styles.manualWrap}>
      {countriesFailed ? (
        <>
          <UnderlineTextInput
            placeholder={t("Country")}
            value={manualCountry}
            onChangeText={onCountrySelect}
            autoCapitalize="words"
          />
          <UnderlineTextInput
            placeholder={t("Town")}
            value={manualTown}
            onChangeText={onTownTextChange}
            editable={Boolean(manualCountry.trim())}
            autoCapitalize="words"
          />
        </>
      ) : (
        <>
          <LocationSelectField
            label={t("Country")}
            placeholder={t("Select your country")}
            value={manualCountry}
            options={countries}
            loading={countriesLoading}
            onSelect={onCountrySelect}
          />
          {townFallback ? (
            <UnderlineTextInput
              placeholder={t("Town")}
              value={manualTown}
              onChangeText={onTownTextChange}
              editable={Boolean(manualCountry)}
              autoCapitalize="words"
            />
          ) : (
            <LocationSelectField
              label={t("Town")}
              placeholder={manualCountry ? t("Select your town") : t("Select a country first")}
              value={manualTown}
              options={cities}
              loading={citiesLoading}
              disabled={!manualCountry}
              onSelect={onTownSelect}
            />
          )}
        </>
      )}
      <TapText
        label={t("Use this location")}
        onPress={onSubmit}
        disabled={!manualCountry.trim() || !manualTown.trim() || resolving}
        loading={resolving}
      />
    </View>
  );
}

export function OnboardingLocationStep({
  value,
  onChange,
  t,
}: {
  value: OnboardingLocationInput | null;
  onChange(value: OnboardingLocationInput): void;
  t(english: string): string;
}) {
  const [status, setStatus] = useState<Status>(value ? "granted" : "idle");
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualCountry, setManualCountry] = useState(value?.country ?? "");
  const [manualTown, setManualTown] = useState(value?.city ?? "");
  const [resolving, setResolving] = useState(false);
  const [countries, setCountries] = useState<string[]>([]);
  const [countriesLoading, setCountriesLoading] = useState(false);
  const [countriesFailed, setCountriesFailed] = useState(false);
  const [cities, setCities] = useState<string[]>([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [townFallback, setTownFallback] = useState(false);

  const manualVisible = showManual || status === "denied";

  useEffect(() => {
    if (!manualVisible || countries.length || countriesLoading || countriesFailed) return;
    setCountriesLoading(true);
    void fetchCountries()
      .then(setCountries)
      .catch(() => setCountriesFailed(true))
      .finally(() => setCountriesLoading(false));
  }, [manualVisible, countries.length, countriesLoading, countriesFailed]);

  useEffect(() => {
    if (!manualCountry || countriesFailed) return;
    setCitiesLoading(true);
    setCities([]);
    setTownFallback(false);
    void fetchCitiesForCountry(manualCountry)
      .then((list) => {
        setCities(list);
        if (list.length === 0) setTownFallback(true);
      })
      .catch(() => setTownFallback(true))
      .finally(() => setCitiesLoading(false));
  }, [manualCountry, countriesFailed]);

  const requestLocation = useCallback(async () => {
    setStatus("requesting");
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setShowManual(true);
        setStatus("denied");
        return;
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const [place] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      onChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        country: place?.country || "Unknown",
        province: place?.region || place?.city || place?.country || "Unknown",
        city: place?.city || place?.subregion || place?.country || "Unknown",
        suburb: place?.district || place?.subregion || undefined,
      });
      setStatus("granted");
    } catch {
      setError(t("Could not detect your location. Pick your country and town below."));
      setShowManual(true);
      setStatus("denied");
    }
  }, [onChange, t]);

  const submitManual = useCallback(async () => {
    const country = manualCountry.trim();
    const town = manualTown.trim();
    if (!country || !town) return;
    setResolving(true);
    try {
      let latitude = 0;
      let longitude = 0;
      try {
        const [geocoded] = await Location.geocodeAsync(`${town}, ${country}`);
        if (geocoded) {
          latitude = geocoded.latitude;
          longitude = geocoded.longitude;
        }
      } catch {
        // Approximate coordinates aren't critical — town/country still get saved.
      }
      onChange({ latitude, longitude, country, province: town, city: town });
      setStatus("granted");
    } finally {
      setResolving(false);
    }
  }, [manualCountry, manualTown, onChange]);

  const handleCountrySelect = useCallback((country: string) => {
    setManualCountry(country);
    setManualTown("");
  }, []);

  if (status === "granted" && value) {
    return (
      <View style={styles.card}>
        <Text style={styles.place}>
          {value.city}
          {value.country ? `, ${value.country}` : ""}
        </Text>
        <Text style={styles.confirmed}>{t("Location set")}</Text>
        <Pressable
          style={styles.linkButton}
          onPress={() => {
            setStatus("idle");
            setShowManual(false);
            setError(null);
          }}
        >
          <Text style={styles.linkText}>{t("Change location")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      {status === "denied" && error && !manualVisible ? (
        <Text style={styles.subtitle}>{error}</Text>
      ) : null}

      {!manualVisible ? (
        <>
          <Pressable
            style={styles.linkButton}
            onPress={() => void requestLocation()}
            disabled={status === "requesting"}
            hitSlop={10}
          >
            {status === "requesting" ? (
              <ActivityIndicator color="#303034" />
            ) : (
              <Text style={styles.primaryLinkText}>{t("Allow location")}</Text>
            )}
          </Pressable>
          <Pressable style={styles.linkButton} onPress={() => setShowManual(true)}>
            <Text style={styles.linkText}>{t("Or pick manually")}</Text>
          </Pressable>
        </>
      ) : null}

      {manualVisible ? (
        <>
          {status === "denied" ? (
            <Text style={styles.manualHint}>{t("Location access was turned off. Pick your country and town below.")}</Text>
          ) : null}
          <ManualLocationPicker
            t={t}
            manualCountry={manualCountry}
            manualTown={manualTown}
            countries={countries}
            countriesLoading={countriesLoading}
            countriesFailed={countriesFailed}
            cities={cities}
            citiesLoading={citiesLoading}
            townFallback={townFallback}
            resolving={resolving}
            onCountrySelect={handleCountrySelect}
            onTownSelect={setManualTown}
            onTownTextChange={setManualTown}
            onSubmit={() => void submitManual()}
          />
          {status === "denied" ? (
            <Pressable style={styles.linkButton} onPress={() => void requestLocation()}>
              <Text style={styles.linkText}>{t("Try location access again")}</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.linkButton} onPress={() => setShowManual(false)}>
              <Text style={styles.linkText}>{t("Allow location")}</Text>
            </Pressable>
          )}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", alignItems: "center", paddingHorizontal: 8, gap: 4, marginTop: 4 },
  subtitle: {
    fontFamily: theme.typography.regular,
    fontSize: 13.5,
    color: "#6B6771",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 10,
    maxWidth: 320,
  },
  manualHint: {
    fontFamily: theme.typography.semibold,
    fontSize: 12,
    color: "#9B98A1",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  manualWrap: { width: "100%", maxWidth: 300, alignItems: "center", alignSelf: "center" },
  place: {
    fontFamily: theme.typography.semibold,
    fontSize: 16,
    color: "#221F26",
    marginTop: 2,
    marginBottom: 4,
    textAlign: "center",
  },
  confirmed: {
    fontFamily: theme.typography.medium,
    fontSize: 13,
    color: "#6B6771",
    marginBottom: 10,
  },
  linkButton: { marginTop: 8, paddingVertical: 6, paddingHorizontal: 10 },
  linkText: { fontFamily: theme.typography.semibold, fontSize: 13, color: "#8F8B93" },
  primaryLinkText: { fontFamily: theme.typography.semibold, fontSize: 15, color: "#303034" },
});

import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Checkbox,
  HelperText,
  Icon,
  List,
  Text,
  TextInput,
} from "react-native-paper";

import { AppButton } from "@ui/atoms/AppButton";
import { AppTextInput } from "@ui/atoms/AppTextInput";
import { useAppTheme } from "@/theme";
import { childTestID } from "@/utils";
import type { StyleEscapeHatches } from "@ui/primitives";

import type {
  AssistanceRequest,
  ContactDetails,
  Traveller,
  TravellerFieldError,
  TravellerType,
} from "../types/domain";

const TYPE_LABEL: Record<TravellerType, string> = {
  adult: "Adult",
  child: "Child",
  infant: "Infant",
};

export interface TravellerDetailsFormProps extends StyleEscapeHatches {
  travellers: Traveller[];
  onChange: (travellers: Traveller[]) => void;
  requirePassport?: boolean;
  assistanceOptions?: AssistanceRequest[];
  bookerContact?: ContactDetails;
  /** Server or client validation results, keyed by traveller id. */
  errors?: Record<string, TravellerFieldError[]>;
  submitting?: boolean;
  onSubmit: (travellers: Traveller[]) => void;
}

/**
 * Repeatable traveller blocks, one accordion each, matching a document rather
 * than a generic contact form. "Use booker's contact details" is an explicit
 * checkbox — contact information is never copied silently, because a traveler
 * scanning the form later has no way to tell that happened.
 */
export const TravellerDetailsForm = ({
  travellers,
  onChange,
  requirePassport = false,
  assistanceOptions = [],
  bookerContact,
  errors = {},
  submitting = false,
  onSubmit,
  style,
  containerStyle,
  testID,
}: TravellerDetailsFormProps) => {
  const theme = useAppTheme();
  const id = testID ?? "traveller-details-form";
  const [expandedId, setExpandedId] = useState<string | null>(
    travellers[0]?.id ?? null,
  );
  const [sameAsBooker, setSameAsBooker] = useState<Record<string, boolean>>({});

  const errorSummary = useMemo(() => Object.values(errors).flat(), [errors]);

  const updateTraveller = (travellerId: string, patch: Partial<Traveller>) => {
    onChange(
      travellers.map((t) => (t.id === travellerId ? { ...t, ...patch } : t)),
    );
  };

  const fieldError = (travellerId: string, field: string) =>
    errors[travellerId]?.find((e) => e.field === field)?.message;

  return (
    <View style={[containerStyle, style]} testID={id}>
      {errorSummary.length > 0 ? (
        <View
          style={[
            styles.summary,
            {
              backgroundColor: theme.colors.errorContainer,
              borderRadius: theme.radii.sm,
              padding: theme.spacing.sm,
            },
          ]}
          accessibilityRole="alert"
          testID={childTestID(id, "error-summary")}
        >
          <Text
            variant="labelMedium"
            style={{ color: theme.colors.onErrorContainer }}
          >
            Please fix {errorSummary.length} issue
            {errorSummary.length === 1 ? "" : "s"} before continuing
          </Text>
        </View>
      ) : null}

      {travellers.map((traveller, index) => {
        const expanded = expandedId === traveller.id;
        const copyContact = sameAsBooker[traveller.id] ?? false;

        return (
          <List.Accordion
            key={traveller.id}
            title={`Traveler ${index + 1}${traveller.firstName ? ` · ${traveller.firstName} ${traveller.lastName}`.trimEnd() : ""}`}
            description={`${TYPE_LABEL[traveller.type]}${index === 0 ? " · Primary traveler" : ""}`}
            expanded={expanded}
            onPress={() => setExpandedId(expanded ? null : traveller.id)}
            left={(props) => (
              <List.Icon
                {...props}
                icon={index === 0 ? "account-star-outline" : "account-outline"}
              />
            )}
            testID={childTestID(id, `traveller-${traveller.id}`)}
          >
            <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                Enter your name exactly as it appears on your travel document.
              </Text>

              <AppTextInput
                label="First name"
                value={traveller.firstName}
                onChangeText={(v) =>
                  updateTraveller(traveller.id, { firstName: v })
                }
                error={!!fieldError(traveller.id, "firstName")}
                errorText={fieldError(traveller.id, "firstName")}
                testID={childTestID(id, `${traveller.id}-first-name`)}
              />
              <AppTextInput
                label="Last name"
                value={traveller.lastName}
                onChangeText={(v) =>
                  updateTraveller(traveller.id, { lastName: v })
                }
                error={!!fieldError(traveller.id, "lastName")}
                errorText={fieldError(traveller.id, "lastName")}
                testID={childTestID(id, `${traveller.id}-last-name`)}
              />

              {traveller.type !== "infant" || requirePassport ? (
                <AppTextInput
                  label="Date of birth"
                  placeholder="YYYY-MM-DD"
                  value={traveller.dateOfBirth ?? ""}
                  onChangeText={(v) =>
                    updateTraveller(traveller.id, { dateOfBirth: v })
                  }
                  error={!!fieldError(traveller.id, "dateOfBirth")}
                  errorText={fieldError(traveller.id, "dateOfBirth")}
                  testID={childTestID(id, `${traveller.id}-dob`)}
                />
              ) : null}

              {requirePassport ? (
                <>
                  <AppTextInput
                    label="Passport number"
                    value={traveller.passport?.number ?? ""}
                    onChangeText={(v) =>
                      updateTraveller(traveller.id, {
                        passport: { ...traveller.passport, number: v },
                      })
                    }
                    error={!!fieldError(traveller.id, "passportNumber")}
                    errorText={fieldError(traveller.id, "passportNumber")}
                    testID={childTestID(id, `${traveller.id}-passport`)}
                  />
                  <AppTextInput
                    label="Nationality"
                    value={traveller.nationality ?? ""}
                    onChangeText={(v) =>
                      updateTraveller(traveller.id, { nationality: v })
                    }
                    error={!!fieldError(traveller.id, "nationality")}
                    errorText={fieldError(traveller.id, "nationality")}
                    testID={childTestID(id, `${traveller.id}-nationality`)}
                  />
                </>
              ) : null}

              {index === 0 ? (
                <>
                  <AppTextInput
                    label="Contact email"
                    keyboardType="email-address"
                    value={traveller.contact?.email ?? ""}
                    onChangeText={(v) =>
                      updateTraveller(traveller.id, {
                        contact: { ...traveller.contact, email: v },
                      })
                    }
                    error={!!fieldError(traveller.id, "email")}
                    errorText={fieldError(traveller.id, "email")}
                    testID={childTestID(id, `${traveller.id}-email`)}
                  />
                  <AppTextInput
                    label="Mobile number"
                    keyboardType="phone-pad"
                    value={traveller.contact?.phone ?? ""}
                    onChangeText={(v) =>
                      updateTraveller(traveller.id, {
                        contact: { ...traveller.contact, phone: v },
                      })
                    }
                    error={!!fieldError(traveller.id, "phone")}
                    errorText={fieldError(traveller.id, "phone")}
                    testID={childTestID(id, `${traveller.id}-phone`)}
                  />
                </>
              ) : bookerContact ? (
                <View>
                  <View style={styles.row}>
                    <Checkbox
                      status={copyContact ? "checked" : "unchecked"}
                      onPress={() => {
                        const next = !copyContact;
                        setSameAsBooker((prev) => ({
                          ...prev,
                          [traveller.id]: next,
                        }));
                        updateTraveller(traveller.id, {
                          contact: next ? bookerContact : undefined,
                        });
                      }}
                    />
                    <Text variant="bodySmall" style={styles.flex}>
                      Use booker's contact details
                    </Text>
                  </View>
                </View>
              ) : null}

              {assistanceOptions.length > 0 ? (
                <View>
                  <Text variant="labelMedium" style={{ marginBottom: 4 }}>
                    Assistance or accessibility requests
                  </Text>
                  {assistanceOptions.map((option) => {
                    const checked = !!traveller.assistance?.some(
                      (a) => a.id === option.id,
                    );
                    return (
                      <View key={option.id} style={styles.row}>
                        <Checkbox
                          status={checked ? "checked" : "unchecked"}
                          onPress={() => {
                            const current = traveller.assistance ?? [];
                            const next = checked
                              ? current.filter((a) => a.id !== option.id)
                              : [...current, option];
                            updateTraveller(traveller.id, { assistance: next });
                          }}
                        />
                        <Text variant="bodySmall" style={styles.flex}>
                          {option.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </View>
          </List.Accordion>
        );
      })}

      <AppButton
        variant="primary"
        size="lg"
        fullWidth
        loading={submitting}
        onPress={() => onSubmit(travellers)}
        containerStyle={{ marginTop: theme.spacing.md }}
        testID={childTestID(id, "submit")}
      >
        Save traveller details
      </AppButton>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  flex: { flex: 1 },
  summary: { marginBottom: 12 },
});

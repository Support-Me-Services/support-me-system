"use client";

import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "solito/navigation";
import { useCreate, CreateOrganizationRequestDtoType } from "@support-me/api-client";
import { Input, Spinner } from "@support-me/ui";
import { getErrorMessage } from "../../lib/errors";

type OrgType = "IND" | "ORG";

const TYPE_OPTIONS: Array<{ value: OrgType; label: string; description: string }> = [
  {
    value: "IND",
    label: "Indywidualna",
    description: "Twoja własna wizytówka. Maksymalnie jedna na konto.",
  },
  {
    value: "ORG",
    label: "Organizacja",
    description: "Dla firmy/grupy. Zostajesz jej pierwszym administratorem.",
  },
];

export function CreateOrganizationScreen() {
  const router = useRouter();
  const { mutateAsync, isPending, error } = useCreate();

  const [type, setType] = useState<OrgType>("IND");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");

  const canSubmit =
    type === "IND" ? firstName.trim() !== "" && lastName.trim() !== "" : name.trim() !== "" && category.trim() !== "";

  const handleSubmit = async () => {
    if (!canSubmit || isPending) return;
    const created = await mutateAsync({
      data: {
        type: type === "IND" ? CreateOrganizationRequestDtoType.IND : CreateOrganizationRequestDtoType.ORG,
        firstName: type === "IND" ? firstName : undefined,
        lastName: type === "IND" ? lastName : undefined,
        name: type === "ORG" ? name : undefined,
        category: type === "ORG" ? category : undefined,
      },
    });
    if (created.id) {
      router.push(`/organizations/${created.id}`);
    }
  };

  return (
    <View className="flex-1 bg-band">
      <View className="mx-auto w-full max-w-[700px] gap-5 p-6 py-12">
        <Text className="font-serif text-[32px] font-bold text-foreground">
          Nowa organizacja
        </Text>

        <View className="w-full gap-4 rounded-card-lg bg-background p-7 shadow-sm">
          <Text className="font-sans text-[14px] font-semibold text-foreground">Typ organizacji</Text>
          <View className="flex-row gap-3">
            {TYPE_OPTIONS.map((option) => {
              const selected = type === option.value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => setType(option.value)}
                  className={`flex-1 gap-1 rounded-card border p-4 ${
                    selected ? "border-accent bg-accent/5" : "border-line bg-background"
                  }`}
                >
                  <Text
                    className={`font-sans text-[15px] font-bold ${selected ? "text-accent" : "text-foreground"}`}
                  >
                    {option.label}
                  </Text>
                  <Text className="font-sans text-[12px] text-muted">{option.description}</Text>
                </Pressable>
              );
            })}
          </View>

          {type === "IND" ? (
            <>
              <Input label="Imię" required value={firstName} onChangeText={setFirstName} placeholder="Jan" />
              <Input label="Nazwisko" required value={lastName} onChangeText={setLastName} placeholder="Kowalski" />
            </>
          ) : (
            <>
              <Input
                label="Nazwa organizacji"
                required
                value={name}
                onChangeText={setName}
                placeholder="Fundacja Dobra Wola"
              />
              <Input
                label="Kategoria"
                required
                value={category}
                onChangeText={setCategory}
                placeholder="Fundacja"
              />
            </>
          )}

          {error ? <Text className="font-sans text-danger">{getErrorMessage(error)}</Text> : null}

          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit || isPending}
            className={`items-center justify-center rounded-pill bg-accent px-6 py-4 ${
              !canSubmit || isPending ? "opacity-50" : ""
            }`}
          >
            {isPending ? <Spinner /> : (
              <Text className="font-sans text-base font-semibold text-accent-foreground">Utwórz organizację</Text>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

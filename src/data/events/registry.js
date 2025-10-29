// src/data/events/registry.js
import { stands as festaCaicaraStands } from "@/data/festaCaicaraStands";

export const eventsRegistry = {
  "festa-caicara": {
    slug: "festa-caicara",
    name: "Festança Caiçara",
    stands: festaCaicaraStands,
    settingsKey: "festanca_visibility",
    imageBasePath: "/event",
  },
};

export function getEventConfig(slug) {
  return eventsRegistry[slug] || null;
}

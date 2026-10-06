import { describe, expect, it } from "vitest";
import { EVENTO_TUTORIAL_RELEVAMIENTO, mostrarTutorialRelevamiento, vistaTutorialRelevamiento } from "@/lib/tutorialRelevamientos";

describe("Vista transitoria de relevamientos", () => {
  it("conserva el paso entre montajes, permite retroceder y se limpia sin almacenamiento", () => {
    const storageAntes = window.localStorage.length;
    const pasos: unknown[] = [];
    const escuchar = (e: Event) => pasos.push((e as CustomEvent).detail);
    window.addEventListener(EVENTO_TUTORIAL_RELEVAMIENTO, escuchar);
    mostrarTutorialRelevamiento("crear");
    expect(vistaTutorialRelevamiento()).toBe("crear");
    mostrarTutorialRelevamiento("carpetas");
    mostrarTutorialRelevamiento("crear");
    mostrarTutorialRelevamiento(null);
    expect(vistaTutorialRelevamiento()).toBeNull();
    expect(pasos).toEqual(["crear", "carpetas", "crear", null]);
    expect(window.localStorage.length).toBe(storageAntes);
    window.removeEventListener(EVENTO_TUTORIAL_RELEVAMIENTO, escuchar);
  });
});
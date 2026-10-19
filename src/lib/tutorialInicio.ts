export const tutorialPendienteKey = (userId: string) => `iustrack:tutorial-oficina-nueva:${userId}`;

export function programarTutorialOficina(userId: string, oficinaId: string) {
  sessionStorage.setItem(tutorialPendienteKey(userId), oficinaId);
}

export function consumirTutorialOficina(userId: string, oficinaId: string) {
  const key = tutorialPendienteKey(userId);
  if (sessionStorage.getItem(key) !== oficinaId) return false;
  sessionStorage.removeItem(key);
  return true;
}
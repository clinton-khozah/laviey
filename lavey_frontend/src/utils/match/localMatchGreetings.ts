function firstName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return 'there';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

export function localMatchGreetings(participantName: string): string[] {
  const first = firstName(participantName);
  return [
    `Hi ${first}! 😊`,
    `Glad we matched 💖`,
    `How's your day? ☀️`,
    `Would love to chat 💬`,
  ];
}

/** Built-in rhythms. Custom ones come from the API. `rest` is the break length. */
export const BUILTIN_MODES = [
  { key: 'pomodoro', name: 'Pomodoro', focus: 25, rest: 5, blurb: 'The classic sprint' },
  { key: '52-17', name: '52 / 17', focus: 52, rest: 17, blurb: 'Long focus, real rest' },
  { key: 'animedoro', name: 'Animedoro', focus: 50, rest: 10, blurb: 'Deep block, then a reward' },
  { key: 'deep-work', name: 'Deep Work', focus: 90, rest: 20, blurb: 'One full ultradian cycle' },
];

export const fromPreset = (preset) => ({
  ...preset,
  key: `custom-${preset.id}`,
  custom: true,
  blurb: 'Your custom brew',
});

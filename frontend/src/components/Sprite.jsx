const CURRENT = { x: 'currentColor' };

/** Render text pixel art as crisp SVG, merging horizontal runs into single rects. */
export function Sprite({ rows, palette = CURRENT, fill, className = 'icon', title }) {
  const rects = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; ) {
      const c = row[x];
      let w = 1;
      while (row[x + w] === c) w++;
      if (c !== '.') rects.push(<rect key={`${x},${y}`} x={x} y={y} width={w} height={1} fill={fill ?? palette[c]} />);
      x += w;
    }
  });
  return (
    <svg
      className={className}
      viewBox={`0 0 ${rows[0].length} ${rows.length}`}
      shapeRendering="crispEdges"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {rects}
    </svg>
  );
}

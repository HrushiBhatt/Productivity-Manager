import { CAFE } from '../sprites';
import { plural } from '../time';
import { Sprite } from './Sprite';

/** Every full brew furnishes a cozy pixel café. Locked items show as silhouettes. */
export function CafeShelf({ completed }) {
  const next = CAFE.find((item) => completed < item.at);
  const prevAt = CAFE.filter((item) => item.at <= completed).at(-1)?.at ?? 0;
  const progress = next ? (completed - prevAt) / (next.at - prevAt) : 1;

  return (
    <>
      <ul className="shelf">
        {CAFE.map((item) => {
          const unlocked = completed >= item.at;
          return (
            <li key={item.id} className={unlocked ? 'unlocked' : 'locked'}>
              <Sprite
                rows={item.rows}
                palette={item.palette}
                fill={unlocked ? undefined : '#242424'}
                className="shelf-sprite"
                title={unlocked ? item.name : `Locked: ${item.at} full brews`}
              />
              <span className="shelf-name">{unlocked ? item.name : plural(item.at, 'brew')}</span>
            </li>
          );
        })}
      </ul>
      <div className="shelf-next">
        <p>
          {next
            ? `${plural(next.at - completed, 'more full brew')} to unlock the ${next.name}.`
            : 'Your café is fully furnished. ☕'}
        </p>
        <div className="meter">
          <span style={{ width: `${progress * 100}%` }} />
        </div>
      </div>
    </>
  );
}

// Everything you have, behind one door.
//
// The last of the interface split. Things you *do* -- take, rest, make, walk -- reach the top
// bar; things you *have* live here. The distinction is the whole plan: a clicker cannot let you
// discover a verb by bumping into it, so verbs must be listed and always reachable, and the
// records they produce must not compete with them for the same row of buttons.
//
// **Two tabs, not four.** The original plan said diary, species met, map and progress, which
// turned out to be wrong about its own subject: `Progress` already *wraps* `Diary` and always
// has, and the overworld is a place you travel from rather than a record you read -- it belongs
// with Travel, where it already is. So the real consolidation is two surfaces, and saying "four"
// would have been inventing work.
//
// The tabs are the Stardew arrangement and the reason is the same: a player looking for something
// they have collected should have one place to look, and finding the wrong tab open is a smaller
// cost than finding the wrong button pressed.
//
// This is a shell. It owns which tab is showing and nothing else -- both panels keep their own
// state, their own escape handling and their own focus behaviour, because they were correct
// before this existed and consolidating surfaces is not a licence to rewrite them.

export type RecordTab = 'journey' | 'collection';

export interface RecordTabsProps {
  tab: RecordTab;
  onTab: (tab: RecordTab) => void;
  /** How many discoveries are under way, for the tab's own badge. */
  journeyCount: number;
  /** How many species have been met. */
  metCount: number;
}

/**
 * The tab strip, rendered *inside* whichever panel is showing.
 *
 * **Not floated over them, which was the first attempt and did not work.** Both panels draw a
 * full-screen veil at `z-index: 40`, so tabs positioned above the page sat underneath it -- the
 * screenshot showed a diary with no tabs at all and the second one unclickable. Each panel takes
 * a `tabs` slot instead, on the same footing as the `footer` slot `Diary` already had.
 */
export function RecordTabs({ tab, onTab, journeyCount, metCount }: RecordTabsProps) {
  return (
    <div className="records-tabs" role="tablist" aria-label="Records">
      <Tab id="journey" label="Journey" count={journeyCount} current={tab} onTab={onTab} />
      <Tab id="collection" label="Met" count={metCount} current={tab} onTab={onTab} />
    </div>
  );
}

function Tab({
  id,
  label,
  count,
  current,
  onTab
}: {
  id: RecordTab;
  label: string;
  count: number;
  current: RecordTab;
  onTab: (tab: RecordTab) => void;
}) {
  const selected = current === id;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      className={selected ? 'records-tab is-on' : 'records-tab'}
      onClick={() => onTab(id)}
    >
      {label}
      {/* The count is on the tab because it is the reason to press it: a diary with three
          discoveries under way is worth opening and an empty one is not. Hidden at zero rather
          than shown as "0", which reads as a broken badge. */}
      {count > 0 && <i className="records-count">{count}</i>}
    </button>
  );
}

import { useStore } from '../store';
import { monthlyRequired, perMonth, goalWindow, isSavingIn } from '../lib/calc';
import { money, monthLabel } from '../lib/format';
import {
  Card,
  Row,
  Field,
  NumberInput,
  TextInput,
  Button,
  DeleteButton,
  Empty,
} from '../components/ui';

export function Goals() {
  const { state, month, addGoal, updateGoal, removeGoal } = useStore();
  const { goals } = state;

  // Only goals actually being saved for this month cost anything this month.
  const dueThisMonth = goals.reduce((sum, g) => sum + monthlyRequired(g, month), 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetCost, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
  const activeCount = goals.filter((g) => isSavingIn(g, month)).length;

  return (
    <>
      <Card title="Summary">
        <Row label="Total target" value={money(totalTarget)} />
        <Row label="Saved so far" value={money(totalSaved)} />
        <div className="divider" />
        <Row
          label={`Set aside in ${monthLabel(month)}`}
          sub={
            goals.length === 0
              ? undefined
              : `${activeCount} of ${goals.length} goal${goals.length === 1 ? '' : 's'} saving this month`
          }
          value={money(dueThisMonth)}
          strong
        />
      </Card>

      <Card
        title="Planned purchases"
        action={
          <Button variant="primary" onClick={addGoal}>
            + Add
          </Button>
        }
      >
        {goals.length === 0 ? (
          <Empty>
            No goals yet. Add a planned purchase and the app will work out what to save each
            month, and when to stop.
          </Empty>
        ) : (
          <ul className="list">
            {goals.map((g) => {
              const window = goalWindow(g);
              const each = perMonth(g);
              const outstanding = Math.max(0, g.targetCost - g.saved);
              const saving = isSavingIn(g, month);
              const finished = month > window.end;

              return (
                <li key={g.id} className="entry">
                  <div className="entry-head">
                    <TextInput
                      value={g.name}
                      onChange={(name) => updateGoal(g.id, { name })}
                      placeholder="Goal, e.g. Holiday"
                    />
                    <DeleteButton
                      onClick={() => removeGoal(g.id)}
                      label={`Delete ${g.name || 'goal'}`}
                    />
                  </div>

                  <div className="entry-grid">
                    <Field label="Target cost">
                      <NumberInput
                        value={g.targetCost}
                        onChange={(targetCost) => updateGoal(g.id, { targetCost })}
                        prefix="£"
                      />
                    </Field>
                    <Field label="Already saved">
                      <NumberInput
                        value={g.saved}
                        onChange={(saved) => updateGoal(g.id, { saved })}
                        prefix="£"
                      />
                    </Field>
                  </div>

                  <Field label="Start saving from">
                    <input
                      className="input"
                      type="month"
                      value={g.startMonth}
                      onChange={(e) => updateGoal(g.id, { startMonth: e.target.value })}
                    />
                  </Field>

                  <Field label="Save for">
                    <div className="seg">
                      <button
                        className={`seg-btn${g.mode === 'months' ? ' active' : ''}`}
                        onClick={() => updateGoal(g.id, { mode: 'months' })}
                        type="button"
                      >
                        A number of months
                      </button>
                      <button
                        className={`seg-btn${g.mode === 'date' ? ' active' : ''}`}
                        onClick={() => updateGoal(g.id, { mode: 'date' })}
                        type="button"
                      >
                        Until a month
                      </button>
                    </div>
                  </Field>

                  {g.mode === 'months' ? (
                    <Field label="Number of months">
                      <NumberInput
                        value={g.months}
                        onChange={(months) => updateGoal(g.id, { months })}
                        suffix="months"
                      />
                    </Field>
                  ) : (
                    <Field label="Last month to save">
                      <input
                        className="input"
                        type="month"
                        value={g.targetMonth}
                        min={g.startMonth}
                        onChange={(e) => updateGoal(g.id, { targetMonth: e.target.value })}
                      />
                    </Field>
                  )}

                  <div className="goal-result">
                    <span>
                      {outstanding === 0 ? (
                        'Fully funded 🎉'
                      ) : (
                        <>
                          {money(outstanding)} over {window.months} month
                          {window.months === 1 ? '' : 's'} ·{' '}
                          {monthLabel(window.start).replace(/ 20/, " '")} →{' '}
                          {monthLabel(window.end).replace(/ 20/, " '")}
                        </>
                      )}
                    </span>
                    <strong>{money(each)}/mo</strong>
                  </div>

                  {outstanding > 0 && !saving && (
                    <p className="entry-foot">
                      {finished
                        ? `Saving finished ${monthLabel(window.end)} — it costs nothing in ${monthLabel(month)}.`
                        : `Saving starts ${monthLabel(window.start)} — it costs nothing in ${monthLabel(month)}.`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

import { useState } from 'react';
import { useStore } from '../store';
import { overtimeFor, basePayFor, rateFor } from '../lib/calc';
import { money, hours, monthBounds, dayLabel, monthLabel } from '../lib/format';
import {
  Card,
  Row,
  Stat,
  Field,
  NumberInput,
  DeleteButton,
  Empty,
} from '../components/ui';

export function Income() {
  const {
    state,
    month,
    setBasePay,
    setRate,
    setMonthOverride,
    addOvertime,
    updateOvertime,
    removeOvertime,
  } = useStore();

  const { min, max } = monthBounds(month);
  const [date, setDate] = useState(min);
  const [newHours, setNewHours] = useState(0);

  const ot = overtimeFor(state, month);
  const override = state.monthOverrides[month] ?? {};
  const effectivePay = basePayFor(state, month);
  const effectiveRate = rateFor(state, month);

  const logHours = () => {
    if (newHours <= 0) return;
    // Guard against a date picker that ignored min/max.
    const day = date >= min && date <= max ? date : min;
    addOvertime(day, newHours);
    setNewHours(0);
  };

  return (
    <>
      <Card title="Pay settings">
        <Field label="Hourly rate (default)">
          <NumberInput value={state.hourlyRate} onChange={setRate} prefix="£" suffix="/hr" />
        </Field>
        <Field label="Monthly base pay (default)">
          <NumberInput value={state.basePay} onChange={setBasePay} prefix="£" />
        </Field>
        <p className="note">
          These apply to every month. Override them just for {monthLabel(month)} below.
        </p>
      </Card>

      <Card title={`Overrides for ${monthLabel(month)}`}>
        <Field
          label="Hourly rate this month"
          hint={
            override.hourlyRate === undefined
              ? `Using default ${money(state.hourlyRate)}/hr`
              : 'Clear the field to fall back to the default'
          }
        >
          <NumberInput
            value={override.hourlyRate}
            placeholder={String(state.hourlyRate)}
            onChange={(hourlyRate) => setMonthOverride(month, { hourlyRate })}
            onClear={() => setMonthOverride(month, { hourlyRate: undefined })}
            allowEmpty
            prefix="£"
            suffix="/hr"
          />
        </Field>
        <Field
          label="Base pay this month"
          hint={
            override.basePay === undefined
              ? `Using default ${money(state.basePay)}`
              : 'Clear the field to fall back to the default'
          }
        >
          <NumberInput
            value={override.basePay}
            placeholder={String(state.basePay)}
            onChange={(basePay) => setMonthOverride(month, { basePay })}
            onClear={() => setMonthOverride(month, { basePay: undefined })}
            allowEmpty
            prefix="£"
          />
        </Field>
      </Card>

      <Card title="Log overtime">
        <div className="quickadd">
          <input
            className="input qa-name"
            type="date"
            value={date}
            min={min}
            max={max}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="qa-amt">
            <NumberInput value={newHours} onChange={setNewHours} suffix="h" />
          </div>
          <button
            className="btn btn-primary qa-add"
            type="button"
            onClick={logHours}
            aria-label="Log hours"
          >
            +
          </button>
        </div>
      </Card>

      <Card title={`Overtime — ${monthLabel(month)}`}>
        <div className="stats">
          <Stat label="Hours logged" value={hours(ot.totalHours)} />
          <Stat
            label="Overtime earned"
            value={money(ot.earnings)}
            sub={`at ${money(effectiveRate)}/hr`}
          />
        </div>

        {ot.entries.length === 0 ? (
          <Empty>No overtime logged for this month yet.</Empty>
        ) : (
          <ul className="list">
            {ot.entries.map((e) => (
              <li key={e.id} className="list-item">
                <div className="list-main">
                  <span className="list-title">{dayLabel(e.date)}</span>
                  <span className="list-sub">{money(e.hours * effectiveRate)}</span>
                </div>
                <div className="list-edit">
                  <NumberInput
                    value={e.hours}
                    onChange={(h) => updateOvertime(e.id, { hours: h })}
                    suffix="h"
                  />
                  <DeleteButton
                    onClick={() => removeOvertime(e.id)}
                    label={`Delete overtime on ${e.date}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="divider" />
        <Row label="Base pay" value={money(effectivePay)} />
        <Row label="Overtime" value={money(ot.earnings)} />
        <Row label="Total income" value={money(effectivePay + ot.earnings)} strong />
      </Card>
    </>
  );
}

import { useStore } from '../store';
import { groupByAccount, groupByCategory } from '../lib/calc';
import { money } from '../lib/format';
import {
  Card,
  Row,
  Field,
  NumberInput,
  TextInput,
  Button,
  DeleteButton,
  Empty,
  Suggestions,
} from '../components/ui';

export function Outgoings() {
  const { state, addOutgoing, updateOutgoing, removeOutgoing } = useStore();
  const { outgoings } = state;

  const total = outgoings.reduce((sum, o) => sum + o.amount, 0);
  const byAccount = groupByAccount(outgoings);
  const byCategory = groupByCategory(outgoings);

  return (
    <>
      <Suggestions id="accounts" values={outgoings.map((o) => o.account)} />
      <Suggestions id="categories" values={outgoings.map((o) => o.category)} />

      <Card title="Summary">
        <Row label="Total outgoings" value={money(total)} strong />
        {byAccount.length > 0 && (
          <>
            <div className="divider" />
            <p className="section-label">By bank account</p>
            {byAccount.map((a) => (
              <Row key={a.account} label={a.account} value={money(a.total)} />
            ))}
          </>
        )}
        {byCategory.length > 1 && (
          <>
            <div className="divider" />
            <p className="section-label">By category</p>
            {byCategory.map((c) => (
              <Row key={c.category} label={c.category} value={money(c.total)} />
            ))}
          </>
        )}
      </Card>

      <Card
        title="All outgoings"
        action={
          <Button variant="primary" onClick={addOutgoing}>
            + Add
          </Button>
        }
      >
        {outgoings.length === 0 ? (
          <Empty>No outgoings yet. Add your first one above.</Empty>
        ) : (
          <ul className="list">
            {outgoings.map((o) => (
              <li key={o.id} className="entry">
                <div className="entry-head">
                  <TextInput
                    value={o.name}
                    onChange={(name) => updateOutgoing(o.id, { name })}
                    placeholder="Name, e.g. Car Insurance"
                  />
                  <DeleteButton
                    onClick={() => removeOutgoing(o.id)}
                    label={`Delete ${o.name || 'outgoing'}`}
                  />
                </div>
                <div className="entry-grid">
                  <Field label="Amount">
                    <NumberInput
                      value={o.amount}
                      onChange={(amount) => updateOutgoing(o.id, { amount })}
                      prefix="£"
                    />
                  </Field>
                  <Field label="Account / card">
                    <TextInput
                      value={o.account}
                      onChange={(account) => updateOutgoing(o.id, { account })}
                      placeholder="e.g. Main Account"
                      list="accounts"
                    />
                  </Field>
                  <Field label="Category">
                    <TextInput
                      value={o.category}
                      onChange={(category) => updateOutgoing(o.id, { category })}
                      placeholder="e.g. Car"
                      list="categories"
                    />
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

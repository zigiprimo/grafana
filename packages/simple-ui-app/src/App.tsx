import { useCallback, useId, useState } from 'react';
import { ComboBox, Field, Input } from '@grafana/ui';
import Chance from 'chance';

import './App.css';

const OPTIONS_LENGTH = 500_000;

const chance = new Chance();
const options = new Array(OPTIONS_LENGTH).fill(0).map((_, index) => ({
  value: index.toString(),
  label: chance.name(),
}));

function App() {
  const labelId = useId();
  const inputId = useId();

  const [value, setValue] = useState<string | undefined>();

  const handleChange = useCallback((newValue: string | undefined) => {
    console.log('combo box emitted', newValue);
    setValue(newValue);
  }, []);

  return (
    <>
      <div>
        <div>
          <Field label="Users" id="users-field">
            <Input />
          </Field>
        </div>

        <hr />

        <div>
          <label id={labelId} htmlFor={inputId}>
            Users:
          </label>

          <ComboBox value={value} onChange={handleChange} labelId={labelId} inputId={inputId} options={options} />
        </div>
      </div>
    </>
  );
}

export default App;

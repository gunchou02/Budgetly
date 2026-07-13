import type { ChangeEvent } from 'react';

export interface AmountInputEvent {
  target: {
    checked: boolean;
    name: string;
    type: 'text';
    value: string;
  };
}

export type FormFieldEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement> | AmountInputEvent;

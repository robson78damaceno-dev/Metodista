export type ActionState<T = unknown> = {
  ok: boolean;
  message: string;
  data?: T;
};

export const initialActionState: ActionState = {
  ok: false,
  message: ""
};

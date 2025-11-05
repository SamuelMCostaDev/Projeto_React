import { memo } from "react";

type Props = {
  text: string;
  done: boolean;
  onToggle(): void;
  onRemove(): void;
};


export default memo(function TodoItem({ text, done, onToggle, onRemove }: Props) {
  return (
    <li style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input type="checkbox" checked={done} onChange={onToggle} />
      <span style={{ textDecoration: done ? "line-through" : "none" }}>{text}</span>
      <button onClick={onRemove}>remover</button>
    </li>
  );
});

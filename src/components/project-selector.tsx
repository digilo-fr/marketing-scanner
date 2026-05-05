"use client";

import { Select } from "@/components/ui/select";
import type { Project } from "@/types";

interface Props {
  projects: Project[];
  value: string;
  onChange: (id: string) => void;
  id?: string;
  required?: boolean;
}

export function ProjectSelector({
  projects,
  value,
  onChange,
  id = "project",
  required,
}: Props) {
  return (
    <Select
      id={id}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Choisir un projet —</option>
      {projects.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </Select>
  );
}

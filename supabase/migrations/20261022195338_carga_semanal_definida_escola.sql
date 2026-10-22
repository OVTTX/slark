-- The school defines weekly lessons; the ceiling is the physical weekly grid.
alter table public.sala_materias drop constraint sala_materias_aulas_semana_check;
alter table public.sala_materias add constraint sala_materias_aulas_semana_check check (aulas_semana between 1 and 30);

begin;
alter table public.generated_images drop constraint if exists generated_images_prompt_check;
alter table public.generated_images add constraint generated_images_prompt_check check(length(prompt)<=12000);
commit;

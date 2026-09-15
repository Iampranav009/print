-- UPI-only vendors can add a complete bank account later.
begin;
alter table public.vendor_bank_details
  alter column account_holder_name drop not null,
  alter column account_number drop not null,
  alter column ifsc_code drop not null;
alter table public.vendor_bank_details
  add constraint vendor_bank_details_complete_account check (
    (account_holder_name is null and account_number is null and ifsc_code is null)
    or (account_holder_name is not null and account_number is not null and ifsc_code is not null)
  );
commit;

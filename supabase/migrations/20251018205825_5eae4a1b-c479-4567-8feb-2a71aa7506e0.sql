-- Delete old admin-focused Getting Started articles
DELETE FROM support_articles WHERE id IN (
  'd24629f2-f77d-474a-8b09-55dd96dc490f',
  '9355cb59-04d6-4966-a1bc-ab485ddaeb92',
  'b0192c05-c0ff-4df8-8147-2e5e160f9c2f',
  '20ffb7c7-c6c2-47ec-8fe2-a4bb3bde2c40',
  'b50a8b93-b8c1-4182-8e7c-91690b32555a',
  '5aaed218-1368-4163-9e87-eca96489da33',
  '16eb8acf-0598-4939-ba2e-e78ed5b675e3'
);
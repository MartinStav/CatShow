export const ADMIN_IMPORT_EXAMPLE = `{
  "competition": {
    "name": "Ukážková súťaž mačiek",
    "date": "2026-04-15",
    "description": "Otvorená medzinárodná výstava mačiek.",
    "location": "Bratislava",
    "status": "paused",
    "published": true,
    "currentRound": null
  },
  "users": [
    { "fullName": "Jana Nováková", "email": "jana.novakova@catshow.sk", "phone": "+421900111333", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Peter Zelený", "email": "peter.zeleny@catshow.sk", "phone": "+421900222333", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Marie Dubois", "email": "marie.dubois@catshow.sk", "phone": "+421900555666", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Anna Malá", "email": "anna.mala@catshow.sk", "phone": "+421900333444", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Boris Hrubý", "email": "boris.hruby@catshow.sk", "phone": "+421908888777", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Eva Svietidlová", "email": "eva.svietidlova@catshow.sk", "password": "DemoSutaz1", "role": "demo" },
    { "fullName": "Fero Stevard", "email": "fero.steward@catshow.sk", "password": "DemoSutaz1", "role": "demo" }
  ],
  "grades": [
    { "code": "EX1", "name": "Excellent 1", "countsAsAccepted": true, "eligibleForNomBis": true, "sortOrder": 0 },
    { "code": "EX2", "name": "Excellent 2", "countsAsAccepted": true, "eligibleForNomBis": false, "sortOrder": 1 },
    { "code": "VG", "name": "Very Good", "countsAsAccepted": false, "eligibleForNomBis": false, "sortOrder": 2 }
  ],
  "titles": [
    { "code": "CAC", "name": "Champion title certificate", "classCodes": ["OPEN"], "sortOrder": 0 },
    { "code": "CACIB", "name": "International Champion certificate", "classCodes": ["CHA"], "sortOrder": 1 },
    { "code": "CAP", "name": "Premior title certificate", "classCodes": ["NEUTER"], "sortOrder": 2 }
  ],
  "classes": [
    { "code": "OPEN", "name": "Open class", "minAgeMonths": 10, "isNeuter": false, "isKittenOrJunior": false, "isSeparateBisCategory": false, "sortOrder": 0 },
    { "code": "CHA", "name": "Champion class", "minAgeMonths": 10, "isNeuter": false, "isKittenOrJunior": false, "isSeparateBisCategory": false, "sortOrder": 1 },
    { "code": "KITTEN", "name": "Kitten", "minAgeMonths": 4, "maxAgeMonths": 7, "isNeuter": false, "isKittenOrJunior": true, "isSeparateBisCategory": true, "sortOrder": 2 },
    { "code": "NEUTER", "name": "Neuter", "minAgeMonths": 10, "isNeuter": true, "isKittenOrJunior": false, "isSeparateBisCategory": true, "sortOrder": 3 }
  ],
  "judges": [
    { "email": "jana.novakova@catshow.sk", "stewardEmail": "fero.steward@catshow.sk" },
    { "email": "peter.zeleny@catshow.sk", "stewardEmail": "fero.steward@catshow.sk" },
    { "phone": "+421900555666" }
  ],
  "exhibitors": [
    { "email": "anna.mala@catshow.sk" },
    { "phone": "+421908888777" },
    { "email": "eva.svietidlova@catshow.sk" }
  ],
  "cats": [
    {
      "registrationNumber": "SK-2026-001",
      "name": "Luna Silver Star",
      "breed": "Perzská dlhosrstá",
      "class": "OPEN",
      "coatType": "Dlhosrstá",
      "sex": "female",
      "age": "adult",
      "exhibitorEmail": "anna.mala@catshow.sk",
      "status": "waiting"
    },
    {
      "registrationNumber": "SK-2026-002",
      "name": "Muffin British",
      "breed": "Britská krátkosrstá",
      "class": "KITTEN",
      "coatType": "Krátkosrstá",
      "sex": "male",
      "age": "kitten",
      "exhibitorEmail": "boris.hruby@catshow.sk",
      "status": "waiting"
    },
    {
      "registrationNumber": "SK-2026-003",
      "name": "Storm Maine",
      "breed": "Maine Coon",
      "class": "OPEN",
      "coatType": "Dlhosrstá",
      "sex": "male",
      "age": "adult",
      "exhibitorEmail": "anna.mala@catshow.sk",
      "status": "waiting"
    },
    {
      "registrationNumber": "SK-2026-004",
      "name": "Sia Chocolate",
      "breed": "Orientálna",
      "class": "OPEN",
      "coatType": "Orientálna/siamská",
      "sex": "female",
      "age": "adult",
      "exhibitorEmail": "eva.svietidlova@catshow.sk",
      "status": "waiting"
    },
    {
      "registrationNumber": "SK-2026-005",
      "name": "Cloud Ragdoll",
      "breed": "Ragdoll",
      "class": "NEUTER",
      "coatType": "Polodlhosrstá",
      "sex": "female",
      "age": "adult",
      "exhibitorEmail": "eva.svietidlova@catshow.sk",
      "status": "waiting"
    },
    {
      "registrationNumber": "SK-2026-006",
      "name": "Tiger Siberian",
      "breed": "Sibírska",
      "class": "CHA",
      "coatType": "Polodlhosrstá",
      "sex": "male",
      "age": "adult",
      "exhibitorEmail": "boris.hruby@catshow.sk",
      "status": "waiting"
    }
  ],
  "judgingOrders": [
    { "judgeEmail": "jana.novakova@catshow.sk", "catNumber": "SK-2026-001", "orderPosition": 0, "tableNumber": 1, "protocolGroup": "Dospelé dlhosrsté" },
    { "judgeEmail": "jana.novakova@catshow.sk", "catNumber": "SK-2026-003", "orderPosition": 1, "tableNumber": 1, "protocolGroup": "Dospelé dlhosrsté" },
    { "judgeEmail": "jana.novakova@catshow.sk", "catNumber": "SK-2026-004", "orderPosition": 0, "tableNumber": 1, "protocolGroup": "Dospelé orientálne" },
    { "judgeEmail": "peter.zeleny@catshow.sk", "catNumber": "SK-2026-006", "orderPosition": 0, "tableNumber": 2, "protocolGroup": "Dospelé polodlhosrsté" },
    { "judgeEmail": "peter.zeleny@catshow.sk", "catNumber": "SK-2026-005", "orderPosition": 0, "tableNumber": 2, "protocolGroup": "Kastráti" },
    { "judgeEmail": "peter.zeleny@catshow.sk", "catNumber": "SK-2026-002", "orderPosition": 0, "tableNumber": 2, "protocolGroup": "Mačiatka" }
  ],
  "bisAwards": [
    { "level": "NOM_BIS", "catNumber": "SK-2026-001", "judgeEmail": "jana.novakova@catshow.sk", "category": "Adult female", "position": 1 },
    { "level": "BIV", "catNumber": "SK-2026-003", "category": "Dlhosrsté dospelé", "sex": "male", "classCode": "OPEN", "position": 1 },
    { "level": "BIS", "catNumber": "SK-2026-003", "category": "Best Adult", "position": 1, "notes": "Finálny víťaz" }
  ]
}`;

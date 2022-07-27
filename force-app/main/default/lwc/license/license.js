import { LightningElement, track, api, wire } from "lwc";
import insertLicenseRecords from "@salesforce/apex/ProviderApplicationFormController.saveRelatedRecords";
import getProvidersRelatedLicense from "@salesforce/apex/ProviderApplicationFormController.getRelatedRecords";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext
} from "lightning/messageService";
import StepCompletionEvent from "@salesforce/messageChannel/StepCompletionEvent__c";
import StateListJson from "@salesforce/resourceUrl/StateListJson";
import LicenseTypeJson from "@salesforce/resourceUrl/LicenseTypeJson";

// License object fields
const RELATED_RECORDS_FIELDS = [
  "Id",
  "Jurisdiction_State__c",
  "License_Number__c",
  "License_Type_ID__c",
  "Primary_License__c"
];

export default class License extends LightningElement {
  @api recordId; //contact recordId
  @track loaded = true; //spinner visibility dependency
  recordsToDelete = []; // array of records to delete
  subscription = null; // subscribe variable
  check;
  @track StateList = []; // variable to store the picklist values
  @track LicenseType = []; // variable to store the picklist values
  @track licenseArray = [
    {
      Id: "",
      Jurisdiction_State__c: "",
      License_Number__c: "",
      License_Type_ID__c: "",
      Primary_License__c: false
    }
  ]; // save the response

  @wire(MessageContext)
  messageContext;

  //License State field JSON
  // get LicenseState() {
  //   return [
  //     { label: "Alaska", value: "Alaska" },
  //     { label: "Alabama", value: "Alabama" },
  //     { label: "Arkansas", value: "Arkansas" },
  //     { label: "Arizona", value: "Arizona" },
  //     { label: "California", value: "California" },
  //     { label: "Colorado", value: "Colorado" },
  //     { label: "Connecticut", value: "Connecticut" },
  //     { label: "District of Columbia", value: "District of Columbia" },
  //     { label: "Delaware", value: "Delaware" },
  //     { label: "Florida", value: "Florida" },
  //     { label: "Georgia", value: "Georgia" },
  //     { label: "Hawaii", value: "Hawaii" },
  //     { label: "Iowa", value: "Iowa" },
  //     { label: "Idaho", value: "Idaho" },
  //     { label: "IL", value: "Illinois" },
  //     { label: "Illinois", value: "Indiana" },
  //     { label: "Kansas", value: "Kansas" },
  //     { label: "Kentucky", value: "Kentucky" },
  //     { label: "Louisiana", value: "Louisiana" },
  //     { label: "Massachusetts", value: "Massachusetts" },
  //     { label: "Maryland", value: "Maryland" },
  //     { label: "Maine", value: "Maine" },
  //     { label: "Michigan", value: "Michigan" },
  //     { label: "Minnesota", value: "Minnesota" },
  //     { label: "Missouri", value: "Missouri" },
  //     { label: "Mississippi", value: "Mississippi" },
  //     { label: "Montana", value: "Montana" },
  //     { label: "North Carolina", value: "North Carolina" },
  //     { label: "North Dakota", value: "North Dakota" },
  //     { label: "Nebraska", value: "Nebraska" },
  //     { label: "New Hampshire", value: "New Hampshire" },
  //     { label: "New Jersey", value: "New Jersey" },
  //     { label: "New Mexico", value: "New Mexico" },
  //     { label: "Nevada", value: "Nevada" },
  //     { label: "New York", value: "NewYork" },
  //     { label: "Ohio", value: "Ohio" },
  //     { label: "Oklahoma", value: "Oklahoma" },
  //     { label: "Oregon", value: "Oregon" },
  //     { label: "Pennsylvania", value: "Pennsylvania" },
  //     { label: "Rhode Island", value: "Rhode Island" },
  //     { label: "South Carolina", value: "South Carolina" },
  //     { label: "South Dakota", value: "South Dakota" },
  //     { label: "Tennessee", value: "Tennessee" },
  //     { label: "Texas", value: "Texas" },
  //     { label: "Utah", value: "Utah" },
  //     { label: "Virginia", value: "Virginia" },
  //     { label: "Vermont", value: "Vermont" },
  //     { label: "Washington", value: "Washington" },
  //     { label: "Wisconsin", value: "Wisconsin" },
  //     { label: "West Virginia", value: "West Virginia" },
  //     { label: "Wyoming", value: "Wyoming" },
  //   ];
  // }

  //License Type field JSON
  // get LicenseType() {
  //   return [
  //     {
  //       label: "Dentist",
  //       value: "0033a031-7008-4e17-ac07-3a9441534dda"
  //     },
  //     {
  //       label: "Licensed Clinical Social Worker Temp/Telehealth",
  //       value: "04008c78-cf09-409f-a0c0-5f7e1943b924"
  //     },
  //     {
  //       label: "Addiction (Substance Use Disorder) Counselor",
  //       value: "07448e15-632c-494f-a98e-0c1b01a599fb"
  //     },
  //     {
  //       label: "Addiction (Substance Use Disorder) Counselor Temp/Telehealth",
  //       value: "0bf43987-cea5-462a-aece-fdca8a06a0ba"
  //     },
  //     {
  //       label: "Chiropractor - Temp/Telehealth",
  //       value: "0cabc9a0-d481-4702-a0e6-b0e1eade2ee2"
  //     },
  //     {
  //       label: "Pharmacy Technician",
  //       value: "0da0c881-b2a7-4aa6-aaff-5946b0b2bb94"
  //     },
  //     {
  //       label: "Licensed Clinical Social Worker w/ Private Independent Practice",
  //       value: "13368862-a722-4348-9274-415a346e69c8"
  //     },
  //     {
  //       label: "Midwife",
  //       value: "1cc52d8f-ef87-46c5-969d-a103e4cd7b95"
  //     },
  //     {
  //       label: "Physical Therapist",
  //       value: "1d36136b-d862-401a-a7e9-6015ed8d37cc"
  //     },
  //     {
  //       label: "Resident",
  //       value: "1e797d85-e22d-4873-bcc5-07fcdf31f8fe"
  //     },
  //     {
  //       label: "Prescriptive Authority",
  //       value: "1f87d51d-e3e8-4d1d-bf20-4b11be53b0a2"
  //     },
  //     {
  //       label: "Nurse Aide",
  //       value: "216a5d46-58c1-49e6-8797-18d3936ce488"
  //     },
  //     {
  //       label: "Social Worker",
  //       value: "24818c17-ca47-4ee4-aebc-6076f8222495"
  //     },
  //     {
  //       label: "Medical Doctor",
  //       value: "25cb4aee-c0c2-419b-b7c0-fd37169e9efb"
  //     },
  //     {
  //       label: "Nurse Practitioners - Furnishing/Prescriptive Authority",
  //       value: "273df472-2b51-4afc-bc4a-b16bc888eab6"
  //     },
  //     {
  //       label: "[DEMO] Registered Nurse",
  //       value: "27d2b074-8f35-4994-a4a8-f193079c8e0a"
  //     },
  //     {
  //       label: "PSYPACT - Temporary Authorization to Practice",
  //       value: "2c60c542-b2de-401c-ba3b-5962968c8f48"
  //     },
  //     {
  //       label: "Genetic Counselor",
  //       value: "2cb1bf9a-bed6-4394-b9ec-5eed3ebcacf5"
  //     },
  //     {
  //       label: "Audiologist",
  //       value: "2e1f54a3-6b40-4d63-a33b-6948e1006d69"
  //     },
  //     {
  //       label: "Licensed Creative Arts Therapist",
  //       value: "33244e25-717a-42a3-9894-8186f76abc43"
  //     },
  //     {
  //       label: "Marriage & Family Therapist Associate",
  //       value: "3423b542-8680-487f-9c9f-f6976b3a4520"
  //     },
  //     {
  //       label: "Physical Therapy Assistant",
  //       value: "34b0b479-b1cf-4da8-8a73-23e43f17c1cd"
  //     },
  //     {
  //       label: "Licensed Professional Counselor",
  //       value: "3d1c90ef-20f6-44d0-a6bc-e7562e252a4b"
  //     },
  //     {
  //       label: "Medical Doctor - Compact",
  //       value: "3f3d9274-758d-4dbe-9cbb-9a140dfd38d1"
  //     },
  //     {
  //       label: "Licensed Independent Social Worker - Supervisor",
  //       value: "41c407ff-4506-47d0-9755-7a4494978300"
  //     },
  //     {
  //       label: "Pharmacy Intern",
  //       value: "4479d648-9d82-4e0c-b9ac-a4682eba01ab"
  //     },
  //     {
  //       label: "Doctor of Osteopathy",
  //       value: "47ab732e-478c-45c1-bfcf-2947add3d458"
  //     },
  //     {
  //       label: "Laboratory Technologist Temp/Telehealth",
  //       value: "4add3b20-be5d-4f28-a505-bcc34e2552c4"
  //     },
  //     {
  //       label: "Laboratory Personnel",
  //       value: "4b6486ba-d0a6-4a16-9c91-e1bb0ef99e07"
  //     },
  //     {
  //       label: "Veterinarian - Temp/Telehealth",
  //       value: "4c918280-9827-4ac5-b145-5229f6bf1a6f"
  //     },
  //     {
  //       label: "Speech-Language Pathologist Assistant",
  //       value: "4cd5ad37-198f-4582-a5a9-bebd12861d88"
  //     },
  //     {
  //       label: "Counselor Associate",
  //       value: "4ddbf5ed-6d8c-4928-91ea-c1ef78765ab0"
  //     },
  //     {
  //       label: "Occupational Therapy Assistant",
  //       value: "570b7520-68a4-4e05-aedb-f3af24c8e79d"
  //     },
  //     {
  //       label: "Optometrist",
  //       value: "598acf71-6f16-4ca6-92f5-5aac241ce048"
  //     },
  //     {
  //       label: "Dental Assistant",
  //       value: "5e245977-d038-4b46-96f4-19ff8f809a0d"
  //     },
  //     {
  //       label: "Registered Nurse",
  //       value: "5e59b903-6c06-4be2-8cc0-2f25fda2772d"
  //     },
  //     {
  //       label: "Sex Offender Treatment Provider",
  //       value: "5e6e99e4-d6f0-4f9b-8e02-5fd245ea6b76"
  //     },
  //     {
  //       label: "Radiology Technician",
  //       value: "5f1c663a-4ff3-4ab6-ac5f-2b0d7899f565"
  //     },
  //     {
  //       label: "Speech-Language Pathologist - Temp/Telehealth",
  //       value: "6236c2a5-a497-48ef-bd44-17f0377a22cb"
  //     },
  //     {
  //       label: "Perfusionist",
  //       value: "62536a5c-d112-491b-a55d-8196bb177cc3"
  //     },
  //     {
  //       label: "Doctor of Osteopathy - Temp/Telehealth",
  //       value: "63752d51-8fef-4943-9dec-8544df347ded"
  //     },
  //     {
  //       label: "Massage Therapist",
  //       value: "6500f639-46b0-4c52-9fd4-52eb78885665"
  //     },
  //     {
  //       label: "Clinical Nurse Specialist",
  //       value: "661fcbef-9df1-4a13-94a3-77d95a86730d"
  //     },
  //     {
  //       label: "Naturopath",
  //       value: "69bb770c-a4ff-4a9c-ad99-8476ef16826f"
  //     },
  //     {
  //       label: "Physician Assistant",
  //       value: "6c25e737-fe60-4356-bdf7-1cbc7a1a7d11"
  //     },
  //     {
  //       label: "Advanced Practice Registered Nurse - Temp/Telehealth",
  //       value: "6c8b836c-8caa-4a03-a4e6-555581591655"
  //     },
  //     {
  //       label: "Licensed Mental Health Counselor Temp/Telehealth",
  //       value: "746924e2-0cea-4a2e-b2c5-834cc4d9a8a6"
  //     },
  //     {
  //       label: "Respiratory Therapist",
  //       value: "74d9423f-020a-40a2-a388-e39b811c6f4e"
  //     },
  //     {
  //       label: "Paramedic",
  //       value: "757f0d84-5649-4911-ab76-084e2ca5a7bf"
  //     },
  //     {
  //       label: "Controlled Substance Registration",
  //       value: "76ab4dc7-168b-445d-9693-dd723783c80b"
  //     },
  //     {
  //       label: "Practical Nurse - Temp/Telehealth",
  //       value: "7c3a3f4d-211d-4cf6-8e0b-61aea8cc5cbe"
  //     },
  //     {
  //       label: "Medical Doctor - Temp/Telehealth",
  //       value: "8fe6ad2b-d72d-4a6c-ae82-fdb2403be2d7"
  //     },
  //     {
  //       label: "Speech-Language Pathologist",
  //       value: "902de3e8-e815-46b8-87b3-ca76fa8da8e4"
  //     },
  //     {
  //       label: "Genetic Counselor - Temp/Telehealth",
  //       value: "93ffabb2-5669-4390-9870-eccba460455a"
  //     },
  //     {
  //       label: "Registered Dietician - Temp/Telehealth",
  //       value: "977d9738-4285-4364-b5d5-9a485ccdc67b"
  //     },
  //     {
  //       label: "Veterinary Technician",
  //       value: "9a0fb7d6-b58a-4150-8e6c-88f1f5522898"
  //     },
  //     {
  //       label: "Naturopath - Temp/Telehealth",
  //       value: "9b7b18b0-b2cc-4c51-8ba6-1274d4b010e3"
  //     },
  //     {
  //       label: "PSYPACT - Authority to Practice Interjurisdictional Telepsychology",
  //       value: "9dedcf51-cc0c-44bb-8f50-dfc75b59cedc"
  //     },
  //     {
  //       label: "Pharmacist",
  //       value: "a04fa8e4-ea5f-4f9f-9e32-f8b68f676f87"
  //     },
  //     {
  //       label: "Occupational Therapiy Assistant - Temp/Telehealth",
  //       value: "a0b3b56d-5f6a-4632-9805-8300d876f1e4"
  //     },
  //     {
  //       label: "Psychologist - Temp/Telehealth",
  //       value: "a3b723b8-17af-42b8-b72c-936d467dc2e3"
  //     },
  //     {
  //       label: "Occupational Therapist - Temp/Telehealth",
  //       value: "a4bc6926-9460-4d09-85b7-692ee0646ac2"
  //     },
  //     {
  //       label: "Psychologist",
  //       value: "a4fa6129-ad82-49f6-b768-b5bc8a06a01e"
  //     },
  //     {
  //       label: "Supervising Physician",
  //       value: "a69f4e8f-aeaa-41f8-b29a-762b12c291a2"
  //     },
  //     {
  //       label: "Pharmacist - Temp/Telehealth",
  //       value: "a79fc385-0c55-4ad3-8037-702986a81a17"
  //     },
  //     {
  //       label: "Clinical Nurse Specialist - Temp/Telehealth",
  //       value: "a88f13b2-80dc-4755-96e4-b6217cddc55c"
  //     },
  //     {
  //       label: "Prosthetist/Orthotist Technician",
  //       value: "ade6d916-bbd0-4951-89a9-25cd9543fa8d"
  //     },
  //     {
  //       label: "Licensed Mental Health Counselor",
  //       value: "afb3b803-37cd-4782-8994-285cc458ebdf"
  //     },
  //     {
  //       label: "Social Worker Associate",
  //       value: "b48ef6e5-d0ae-4816-85dc-dbdc0e3c1adf"
  //     },
  //     {
  //       label: "Chiropractor",
  //       value: "b594eae0-b580-482e-8503-11e45a3cf4b0"
  //     },
  //     {
  //       label: "Nurse Practitioner",
  //       value: "b8119f7f-d3d3-4c37-9cc0-f6c77cd7cb14"
  //     },
  //     {
  //       label: "Marriage & Family Therapist",
  //       value: "bafd28e8-29d1-44c3-8765-9479679e4066"
  //     },
  //     {
  //       label: "Physical Therapist - Temp/Telehealth",
  //       value: "bcbf02a9-cd5c-408b-b9d9-ac29c3ed6894"
  //     },
  //     {
  //       label: "Physician Assistant - Temp/Telehealth",
  //       value: "c4c42c49-376a-43ca-959a-c47e86e5beb4"
  //     },
  //     {
  //       label: "Certified Nurse Midwife",
  //       value: "c51fbfad-d7a1-4268-94e5-6f1d6ab12a88"
  //     },
  //     {
  //       label: "Associate Psychologist",
  //       value: "c549a342-e063-4a61-a5ca-863e625bacfc"
  //     },
  //     {
  //       label: "Licensed Professional Clinical Counselor",
  //       value: "c82af0ba-8fb5-4fcf-9d2d-9ef4b12e7fc9"
  //     },
  //     {
  //       label: "Certified Registered Nurse Anesthetist - Temp/Telehealth",
  //       value: "ce293320-cd42-4b38-a30a-d2bcbe95a6dd"
  //     },
  //     {
  //       label: "Authorization to Administer Injectables for Pharmacist",
  //       value: "cfa0333a-ae87-4ca6-bc63-836da5e3fd6d"
  //     },
  //     {
  //       label: "Anesthesiologist Assistant",
  //       value: "d2183f36-012a-4593-bd4f-5f5d0638cee9"
  //     },
  //     {
  //       label: "Licensed Professional Clinical Counselor Supervisor",
  //       value: "d283a3b4-7055-4c7a-9af4-ff3a8cead646"
  //     },
  //     {
  //       label: "Licensed Marriage and Family Temp/Telehealth",
  //       value: "d3653279-a334-4419-8d35-78c7e3fa59f4"
  //     },
  //     {
  //       label: "Clinical Substance Abuse Counselor",
  //       value: "d43cfd9c-d758-4521-b77e-eeafead00700"
  //     },
  //     {
  //       label: "Athletic Trainer",
  //       value: "d988d68c-b7d4-402b-89cf-2201518d9880"
  //     },
  //     {
  //       label: "Practical Nurse",
  //       value: "da29fc11-8bf0-4f80-8a3d-4a0f131019dd"
  //     },
  //     {
  //       label: "Dental Hygienist",
  //       value: "de7a65dd-1b7b-42ec-9bc0-488e844f3e01"
  //     },
  //     {
  //       label: "Registered Nurse - Temp/Telehealth",
  //       value: "e00bbbb0-e0e4-45c9-90fb-9b7ec406a2fe"
  //     },
  //     {
  //       label: "Audiologist - Temp/Telehealth",
  //       value: "e182e748-5ddd-4c2f-9aef-df3a1185ed34"
  //     },
  //     {
  //       label: "Registered Dietician",
  //       value: "e1abc6af-62fe-47a9-8561-10e82673c5c7"
  //     },
  //     {
  //       label: "Addiction (Substance Use Disorder) Counselor Associate",
  //       value: "e273a995-e9cd-4043-a066-5797ac4489b8"
  //     },
  //     {
  //       label: "Psychoanalyst",
  //       value: "e275c8d8-42f7-4b3a-b5cd-786f2fc57f3a"
  //     },
  //     {
  //       label: "Doctor of Osteopathy - Compact",
  //       value: "e6ef7c8c-c921-45b3-8f52-d0f87a9f6a3a"
  //     },
  //     {
  //       label: "Massage Therapist - Temp/Telehealth",
  //       value: "e70ef322-a334-48e9-b3b1-2eaf90b626e6"
  //     },
  //     {
  //       label: "Podiatrist",
  //       value: "e7c3f77f-700c-4005-b1a0-c0c706b26652"
  //     },
  //     {
  //       label: "Licensed Professional Counselor Supervisor",
  //       value: "e8467f17-5a05-4669-ae9d-1a3e6fea8741"
  //     },
  //     {
  //       label: "Telemedicine",
  //       value: "ea0a71cc-6695-4126-8468-66700f379f5e"
  //     },
  //     {
  //       label: "Licensed Clinical Social Worker",
  //       value: "ec36ca23-0eb4-4e89-a651-409bbfebd63c"
  //     },
  //     {
  //       label: "Nursing Home Administrator",
  //       value: "ee47bf1d-0149-4eac-89d1-afe3128d28a2"
  //     },
  //     {
  //       label: "Occupational Therapist",
  //       value: "f471dd99-72fe-47e1-b55a-841bb03eeb5b"
  //     },
  //     {
  //       label: "Emergency Medical Technician",
  //       value: "f4b802a5-4af1-4680-a41f-2d6331593abd"
  //     },
  //     {
  //       label: "Physical Therapy Assistant - Temp/Telehealth",
  //       value: "f4f37180-c3bb-4120-a771-6180321f077d"
  //     },
  //     {
  //       label: "Veterinarian",
  //       value: "f8372640-7cac-4ee2-8920-b164e1b50d23"
  //     },
  //     {
  //       label: "Certified Registered Nurse Anesthetist",
  //       value: "f87de0e1-c6c9-4e71-b27f-f3ef9ba9b272"
  //     },
  //     {
  //       label: "Acupuncturist",
  //       value: "fdd5617d-3bb5-471b-a77c-4b1afc38ca36"
  //     },
  //     {
  //       label: "Psychotherapist",
  //       value: "ff99e99d-3af6-4ab9-b794-f0d0f1daad6f"
  //     }
  //   ]
  // }

  connectedCallback() {
    /*Static Resource call for State combobox field */
    let request = new XMLHttpRequest();
    request.open("GET", StateListJson, false);
    request.send(null);
    this.StateList = JSON.parse(request.responseText);

    /*Static Resource call for License Type combobox field */
    let requestforLicenseType = new XMLHttpRequest();
    requestforLicenseType.open("GET", LicenseTypeJson, false);
    requestforLicenseType.send(null);
    this.LicenseType = JSON.parse(requestforLicenseType.responseText);

    this.subscribeToMessageChannel();
    console.log("RecordId: " + this.recordId);
    if (this.recordId != undefined) {
      this.retrieveRecord();
    }
  }

  /*Handles the onchange of every input fields */
  handleInputBoxChange(event) {
    if (event.target.label == "License State") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[
        event.currentTarget.dataset.index
      ].Jurisdiction_State__c = event.detail.value;
    } else if (event.target.label == "License Number") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[event.currentTarget.dataset.index].License_Number__c =
        event.detail.value;
    } else if (event.target.label == "License Type") {
      let value = event.detail.value;
      if (
        this.licenseArray[event.currentTarget.dataset.index]
          .Primary_License__c &&
        (value.trim() != "" || value != undefined)
      ) {
        event.currentTarget.setCustomValidity("");
        event.currentTarget.reportValidity();
      }
      this.licenseArray[event.currentTarget.dataset.index].License_Type_ID__c =
        event.detail.value;
    } else if (event.target.label == "Primary License") {
      this.licenseArray[event.currentTarget.dataset.index].Primary_License__c =
        event.target.checked;
      console.log(event.currentTarget.dataset.index);

      for (var i = 0; i < this.licenseArray.length; i++) {
        console.log("i", i);
        if (i != event.currentTarget.dataset.index && event.target.checked) {
          console.log("If");
          this.licenseArray[i].Primary_License__c = false;
        }
      }
      console.log(JSON.stringify(this.licenseArray));

      // this.licenseArray.forEach((e, index) => {
      //   e.Primary_License__c = (index == parseInt(event.currentTarget.dataset.index)) ? event.target.checked : !event.target.checked;
      // });
    }
  }

  /*Invokes on click of Add License Button */
  addLicenses() {
    this.licenseArray.push({
      Id: "",
      Jurisdiction_State__c: "",
      License_Number__c: "",
      License_Type_ID__c: "",
      Primary_License__c: false
    });
  }

  /*Invokes on click of cross icon to remove the particular record */
  removeLicense(event) {
    console.log(event.currentTarget.dataset.index);
    let index = event.currentTarget.dataset.index;
    if (this.licenseArray[index].Id != "") {
      this.recordsToDelete.push(this.licenseArray[index].Id);
    }
    this.licenseArray.splice(index, 1);
  }

  /*Retrieves the object records */
  async retrieveRecord() {
    try {
      this.loaded = false;
      const relatedrecordsresponse = await getProvidersRelatedLicense({
        recId: this.recordId,
        fields: RELATED_RECORDS_FIELDS.toString(),
        sObjectName: "License__c",
        relationshipField: "Provider__c"
      });
      console.log("548", relatedrecordsresponse);
      if (relatedrecordsresponse.length > 0) {
        let parseRecords = [];
        relatedrecordsresponse.forEach((e, index) => {
          let parseObject = {};
          parseObject.Id = e.Id;
          parseObject.Jurisdiction_State__c = e.Jurisdiction_State__c;
          parseObject.License_Number__c = e.License_Number__c;
          parseObject.License_Type_ID__c = e.License_Type_ID__c;
          parseObject.Primary_License__c = e.Primary_License__c;
          parseRecords.push(parseObject);
        });
        console.log("557", parseRecords);
        this.licenseArray = [...parseRecords];
        console.log("558", this.licenseArray);
      }
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: true, data: this.recordId, stepname: "license" }
        })
      );
      this.loaded = true;
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("recordretreiveevent", {
          detail: { retreived: false, data: undefined, stepname: "license" }
        })
      );
      this.loaded = true;
    }
  }

  /*Saves/Create the record */
  async saveRecord() {
    try {
      this.loaded = false;
      let recordArray = [];
      let flag = true;
      this.licenseArray.forEach((e, index) => {
        if (e.Primary_License__c) {
          let target = this.template.querySelectorAll(`[data-id="${index}"]`);
          target.forEach((e1) => {
            if (
              e1.value == "" ||
              e1.value == undefined ||
              e1.value.trim().length == 0
            ) {
              e1.setCustomValidity("Complete this field");
              this.loaded = true;
              e1.reportValidity();
              flag = false;
            }
          });
          if (!flag) {
            this.dispatchEvent(
              new CustomEvent("stepcompletionevent", {
                detail: {
                  isCompleted: false,
                  data: undefined,
                  stepname: "license"
                }
              })
            );
            return;
          }
        }

        let dataProcessObject =
          e.Id != ""
            ? e
            : {
                Jurisdiction_State__c: e.Jurisdiction_State__c,
                License_Number__c: e.License_Number__c,
                License_Type_ID__c: e.License_Type_ID__c,
                Primary_License__c: e.Primary_License__c
              };
        if (
          !(
            e.Id == "" &&
            e.Jurisdiction_State__c == "" &&
            e.License_Number__c == "" &&
            e.License_Type_ID__c == "" &&
            e.Primary_License__c == false
          )
        ) {
          dataProcessObject.Provider__c = this.recordId;
          recordArray.push(dataProcessObject);
        }
      });
      console.log("581", recordArray);
      if (flag) {
        if (!(recordArray.length == 0 && this.recordsToDelete.length == 0)) {
          await insertLicenseRecords({
            sObjectData: JSON.stringify(recordArray).toString(),
            recordsToDelete: JSON.stringify(this.recordsToDelete).toString(),
            sObjectName: "License__c"
          });
        }
        this.loaded = true;
        this.dispatchEvent(
          new CustomEvent("stepcompletionevent", {
            detail: {
              isCompleted: true,
              data: this.recordId,
              stepname: "license"
            }
          })
        );
      }
    } catch (error) {
      console.log(error);
      this.dispatchEvent(
        new CustomEvent("stepcompletionevent", {
          detail: { retreived: false, data: undefined, stepname: "license" }
        })
      );
      this.loaded = true;
    }
  }

  /*LMS subscribe method : called when payload is dispatched */
  subscribeToMessageChannel() {
    if (!this.subscription) {
      this.subscription = subscribe(
        this.messageContext,
        StepCompletionEvent,
        (message) => {
          console.log(message);
          if (message.stepName == "license") {
            this.saveRecord();
          }
        },
        { scope: APPLICATION_SCOPE }
      );
    }
  }

  /*LMS unsubscribe method */
  unsubscribeToMessageChannel() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }

  disconnectedCallback() {
    this.unsubscribeToMessageChannel();
  }
}

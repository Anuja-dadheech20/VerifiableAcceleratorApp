/**
 * @description       :
 * @author            : Anuja Dadheech
 * @group             :
 * @last modified on  : 07-26-2022
 * @last modified by  : Anuja Dadheech
 **/

@isTest
public class ProviderApplicationFormControllerTest {
  @testSetup
  static void setupTestData() {
    Contact contact = new Contact(
      FirstName = 'Test',
      LastName = 'Contact',
      Email = 'test@gmail.com',
      Birthdate = System.today()
    );
    insert contact;
    List<verifiable__Alias__c> aliasList = new List<verifiable__Alias__c>();
    for (Integer i = 1; i <= 100; i++) {
      verifiable__Alias__c alias = new verifiable__Alias__c(
        verifiable__First_Name__c = 'Test',
        verifiable__Last_Name__c = 'Alias' + i,
        Provider__c = contact.Id
      );
      aliasList.add(alias);
    }
    insert aliasList;
  }

  @isTest
  static void saveContactTest() {
    Contact contact = new Contact(FirstName = 'Test New', LastName = 'Contact');
    Test.startTest();
    Id contactId = ProviderApplicationFormController.saveContact(contact);
    Test.stopTest();
    System.assertNotEquals(null, contactId, 'Records shouldn\'t be retrieved.');
  }

  @isTest
  static void saveContactExceptionTest() {
    try {
      Contact contact = new Contact(FirstName = 'Test');
      Test.startTest();
      Id contactId = ProviderApplicationFormController.saveContact(contact);
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }

  @isTest
  static void saveRelatedRecordsTest() {
    Contact contact = [SELECT Id FROM Contact WHERE FirstName = 'Test' LIMIT 1];
    List<verifiable__Alias__c> aliasList = new List<verifiable__Alias__c>();
    for (Integer i = 1; i <= 10; i++) {
      verifiable__Alias__c alias = new verifiable__Alias__c(
        verifiable__First_Name__c = 'Test',
        verifiable__Last_Name__c = 'Alias New' + i,
        Provider__c = contact.Id
      );
      aliasList.add(alias);
    }
    List<verifiable__Alias__c> aliasToDeleteList = [
      SELECT Id
      FROM verifiable__Alias__c
      LIMIT 5
    ];

    List<Id> aliasToDeleteListOfIds = new List<Id>();
    for (verifiable__Alias__c alias : aliasToDeleteList) {
      aliasToDeleteListOfIds.add(alias.Id);
    }

    Test.startTest();
    List<Id> aliasIdsList = ProviderApplicationFormController.saveRelatedRecords(
      JSON.serialize(aliasList),
      JSON.serialize(aliasToDeleteListOfIds),
      'verifiable__Alias__c'
    );
    List<verifiable__Alias__c> aliasListNew = [
      SELECT Id
      FROM verifiable__Alias__c
    ];
    Test.stopTest();
    System.assert(aliasIdsList.size() > 0, 'Related Records saved');
    System.assertEquals(105, aliasListNew.size(), 'Records Saved');
  }

  @isTest
  static void saveRelatedRecordsExceptionTest() {
    try {
      Test.startTest();
      List<Id> aliasIdsList = ProviderApplicationFormController.saveRelatedRecords(
        '',
        '',
        ''
      );
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }

  @isTest
  static void getRecordTest() {
    Contact contact = [SELECT Id FROM Contact WHERE FirstName = 'Test' LIMIT 1];
    Test.startTest();
    String fields = 'FirstName, LastName, Phone, Email, NPI_Number__c, Birthdate';
    Contact contactReturned = (Contact) ProviderApplicationFormController.getRecord(
      contact.Id,
      fields,
      'Contact'
    );
    Test.stopTest();
    System.assertNotEquals(
      null,
      contactReturned,
      'Records shouldn\'t be retrieved.'
    );
  }

  @isTest
  static void getRecordExceptionTest() {
    try {
      Contact contact = [
        SELECT Id
        FROM Contact
        WHERE FirstName = 'Test'
        LIMIT 1
      ];
      Test.startTest();
      Contact contactReturned = (Contact) ProviderApplicationFormController.getRecord(
        contact.Id,
        '',
        'Contact'
      );
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }

  @isTest
  static void getRelatedRecordsTest() {
    Contact contact = [SELECT Id FROM Contact WHERE FirstName = 'Test' LIMIT 1];
    Test.startTest();
    String relatedFields = 'Id, verifiable__First_Name__c, verifiable__Last_Name__c';
    List<verifiable__Alias__c> aliasReturnedList = (List<verifiable__Alias__c>) ProviderApplicationFormController.getRelatedRecords(
      contact.Id,
      relatedFields,
      'verifiable__Alias__c',
      'Provider__c'
    );
    Test.stopTest();
    System.assert(aliasReturnedList.size() > 0, 'Records Retrieved');
  }

  @isTest
  static void getRelatedRecordsExceptionTest() {
    try {
      Contact contact = [
        SELECT Id
        FROM Contact
        WHERE FirstName = 'Test'
        LIMIT 1
      ];
      Test.startTest();
      List<verifiable__Alias__c> aliasReturnedList = (List<verifiable__Alias__c>) ProviderApplicationFormController.getRelatedRecords(
        contact.Id,
        '',
        'verifiable__Alias__c',
        'Provider__c'
      );
      Test.stopTest();
    } catch (Exception e) {
      System.assertEquals(
        'Script-thrown exception',
        e.getMessage(),
        'Exception Not Thrown'
      );
    }
  }
}

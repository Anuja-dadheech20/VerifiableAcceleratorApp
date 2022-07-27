/**
 * @description       :
 * @author            : Anuja Dadheech
 * @group             :
 * @last modified on  : 07-26-2022
 * @last modified by  : Anuja Dadheech
 **/

public with sharing class ProviderApplicationFormController {
  // Static variable to save the object of the without sharing inner class
  private static SystemContext systemCtx = new SystemContext();

  /**
   * @description Without Sharing Inner class
   **/
  private without sharing class SystemContext {
    public SObject querySingleRecord(String query) {
      return Database.query(query);
    }

    public List<SObject> queryMultipleRecords(String query) {
      return Database.query(query);
    }

    public Id upsertSingleRecord(SObject record) {
      Database.UpsertResult result = Database.upsert(record);
      return result.getId();
    }

    public List<Id> upsertMultipleRecords(List<SObject> records) {
      Database.UpsertResult[] srList = Database.upsert(records);
      List<Id> recordIds = new List<Id>();
      for (Database.UpsertResult result : srList) {
        if (result.isSuccess()) {
          recordIds.add(result.getId());
        }
      }
      return recordIds;
    }

    public void deleteMultipleRecords(List<Id> records) {
      Database.delete(records);
    }
  }

  /**
   * @description Insert/Upsert the Contact(Provider)
   * @param     con (Contact): Contact(Provider) record
   * @return    Id:  Returns the record-Id of the contact
   **/
  @AuraEnabled
  public static Id saveContact(Contact con) {
    try {
      Id recId = systemCtx.upsertSingleRecord(con);
      return recId;
    } catch (Exception ex) {
      throw new AuraHandledException(ex.getMessage());
    }
  }

  /**
   * @description Insert the related records of the contact
   * @param     sObjectData (String): Related object data to be created
   * @param     recordsToDelete (String): Related object recordId to delete
   * @param     sObjectName (String): The API name of the sObject
   **/
  @AuraEnabled
  public static List<Id> saveRelatedRecords(
    String sObjectData,
    String recordsToDelete,
    String sObjectName
  ) {
    try {
      System.debug('sobject' + sObjectData);
      List<Id> recordDeleteList = (List<Id>) JSON.deserialize(
        recordsToDelete,
        List<Id>.class
      );
      if (recordDeleteList.size() > 0) {
        systemCtx.deleteMultipleRecords(recordDeleteList);
      }
      String listType = 'List<' + sObjectName + '>';
      List<SObject> recordsToUpsert = new List<SObject>();
      recordsToUpsert = (List<SObject>) JSON.deserialize(
        sObjectData,
        Type.forName(listType)
      );
      List<Id> ids = null;
      if (recordsToUpsert.size() > 0) {
        ids = systemCtx.upsertMultipleRecords(recordsToUpsert);
      }
      return ids;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Insert the Disclosure record
   * @param     sObjectData (String): Disclosure object data to be created
   * @param     contactId (String): Related contact-Id
   * @return     Id : The Id of the Disclosure Object Record
   **/
  @AuraEnabled
  public static Id saveDisclosureRecords(String sObjectData, Id contactId) {
    try {
      System.debug('sobject' + sObjectData);

      verifiable__Disclosure_Question__c rec = new verifiable__Disclosure_Question__c();
      rec.Data__c = sObjectData;
      rec.verifiable__Provider__c = contactId;
      System.debug('contactId' + contactId);
      System.debug(rec.verifiable__Provider__c);
      Id ids = systemCtx.upsertSingleRecord(rec);
      System.debug('ids' + ids);
      return ids;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Gets the records of the sObject
   * @param     recId (String): The Id of the record
   * @param     fields (String): The fields to fetch
   * @param     sObjectName (String): The API name of the sObject
   * @return    SObject:  Returns the record of the SObject
   **/
  @AuraEnabled
  public static SObject getRecord(
    String recId,
    String fields,
    String sObjectName
  ) {
    try {
      String query =
        'Select ' +
        fields +
        ' from ' +
        sObjectName +
        ' where Id = \'' +
        recId +
        '\' LIMIT 1';
      Sobject record = systemCtx.querySingleRecord(query);
      return record;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Gets the records of related objects of Contact
   * @param     recId (String): The Id of the record
   * @param     fields (String): The fields to fetch
   * @param     sObjectName (String): The API name of the sObject
   * @param     relationshipField (String): The API Name of the lookup field of Contact Object on it's related object
   * @return    SObject:  Returns the records of the related SObjects
   **/
  @AuraEnabled
  public static List<SObject> getRelatedRecords(
    String recId,
    String fields,
    String sObjectName,
    String relationshipField
  ) {
    try {
      String query =
        'Select ' +
        fields +
        ' from ' +
        sObjectName +
        ' where ' +
        relationshipField +
        ' = \'' +
        recId +
        '\' ';
      List<SObject> records = systemCtx.queryMultipleRecords(query);
      return records;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}

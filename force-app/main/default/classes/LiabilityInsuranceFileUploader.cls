/**
 * @description       :
 * @author            : Anuja Dadheech
 * @group             :
 * @last modified on  : 07-26-2022
 * @last modified by  : Anuja Dadheech
 **/

public with sharing class LiabilityInsuranceFileUploader {
  // Static variable to save the object of the without sharing inner class
  private static SystemContext systemCtx = new SystemContext();

  /**
   * @description File Wrapper class
   **/
  public class LiabilityFileWrapper {
    @AuraEnabled
    public String id;
    @AuraEnabled
    public String title;
    @AuraEnabled
    public String versionData;
    @AuraEnabled
    public Integer size;
    @AuraEnabled
    public String contentVersionId;
    @AuraEnabled
    public String contentDocumentId;
    @AuraEnabled
    public String contentDocumentLinkRecordId;
  }

  /**
   * @description Without Sharing Inner class
   **/
  private without sharing class SystemContext {
    public List<SObject> queryRecords(String query) {
      System.debug(query);
      return Database.query(query);
    }
    public List<SObject> queryRecordsWithListIds(String query, List<Id> ids) {
      System.debug(query);
      return Database.query(query);
    }
    public List<SObject> queryRecordsWithSetIds(String query, Set<Id> ids) {
      System.debug(query);
      return Database.query(query);
    }
    public void deleteRecords(List<Id> recordId) {
      Database.delete(recordId);
    }
    public List<Id> upsertRecords(List<SObject> record) {
      Database.UpsertResult[] srList = Database.upsert(record);
      List<Id> recordIds = new List<Id>();
      for (Database.UpsertResult result : srList) {
        if (result.isSuccess()) {
          recordIds.add(result.getId());
        }
      }
      return recordIds;
    }
  }

  /**
   *
   * @description Deletes File
   * @param recordIds (String) :  record Id to Delete
   *
   **/
  @AuraEnabled
  public static void deleteFiles(String recordIds) {
    try {
      List<Id> parsedRecordIds = (List<Id>) JSON.deserialize(
        recordIds,
        List<Id>.class
      );
      if (parsedRecordIds.size() > 0) {
        systemCtx.deleteRecords(parsedRecordIds);
      }
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Get file details
   * @param ids (String) : recordId to get files
   * @return Wrapper : return respective record wrapper
   **/
  @AuraEnabled
  public static List<LiabilityFileWrapper> getFiles(String ids) {
    List<Id> liablityIds = (List<Id>) JSON.deserialize(ids, List<Id>.class);

    List<Sobject> records = systemCtx.queryRecordsWithListIds(
      'Select Id,ContentDocumentId,LinkedEntityId from ContentDocumentLink where LinkedEntityId IN :ids',
      liablityIds
    );
    Map<Id, ContentDocumentLink> contentDocumentMappedWithRecordId = new Map<Id, ContentDocumentLink>();
    for (Integer i = 0; i < records.size(); i++) {
      contentDocumentMappedWithRecordId.put(
        (Id) records[i].get('ContentDocumentId'),
        (ContentDocumentLink) records[i]
      );
    }

    Set<Id> contentDocumentIds = contentDocumentMappedWithRecordId.keySet();
    List<SObject> contentVersions = systemCtx.queryRecordsWithSetIds(
      'Select Id , ContentDocumentId , VersionData , Title , FileType , ContentSize from ContentVersion where ContentDocumentId IN :ids',
      contentDocumentIds
    );

    List<LiabilityFileWrapper> result = new List<LiabilityFileWrapper>();
    for (Integer i = 0; i < contentVersions.size(); i++) {
      String contentDocumentId = (Id) contentVersions[i]
        .get('ContentDocumentId');
      ContentDocumentLink contentDocLinkRecord = contentDocumentMappedWithRecordId.get(
        contentDocumentId
      );
      LiabilityFileWrapper rec = new LiabilityFileWrapper();
      rec.id = contentDocLinkRecord.LinkedEntityId;
      rec.contentVersionId = (Id) contentVersions[i].get('Id');
      rec.title = (String) contentVersions[i].get('Title');
      Blob data = (Blob) contentVersions[i].get('VersionData');
      rec.versionData = EncodingUtil.base64Encode(data);
      rec.contentDocumentId = contentDocumentId;
      rec.contentDocumentLinkRecordId = contentDocLinkRecord.Id;
      rec.size = (Integer) contentVersions[i].get('ContentSize');
      result.add(rec);
    }
    return result;
  }

  /**
   * @description Upload files
   * @param data (String)  : Data string
   **/
  @AuraEnabled
  public static void uploadFiles(String data) {
    try {
      List<LiabilityFileWrapper> wrapperList = (List<LiabilityFileWrapper>) JSON.deserialize(
        data,
        List<LiabilityFileWrapper>.class
      );
      System.debug('34 -> ' + wrapperList);

      List<ContentVersion> contentVersions = new List<ContentVersion>();
      for (Integer i = 0; i < wrapperList.size(); i++) {
        contentVersions.add(
          new ContentVersion(
            Id = wrapperList[i].contentVersionId,
            VersionData = EncodingUtil.base64Decode(wrapperList[i].versionData),
            Title = wrapperList[i].title,
            PathOnClient = wrapperList[i].title,
            isMajorVersion = false
          )
        );
      }
      List<Id> cvIds = systemCtx.upsertRecords((List<SObject>) contentVersions);

      Map<Id, Id> recordIdMappedWithContentDocument = new Map<Id, Id>();
      for (Integer i = 0; i < wrapperList.size(); i++) {
        recordIdMappedWithContentDocument.put(wrapperList[i].Id, cvIds[i]);
      }
      List<SObject> contentVersionsAfterUpsert = systemCtx.queryRecordsWithListIds(
        'Select Id,ContentDocumentId from ContentVersion where Id IN :Ids ',
        cvIds
      );
      Map<Id, Id> convertListIntoMap = new Map<Id, Id>();
      for (Integer i = 0; i < contentVersionsAfterUpsert.size(); i++) {
        convertListIntoMap.put(
          (Id) contentVersionsAfterUpsert[i].get('Id'),
          (Id) contentVersionsAfterUpsert[i].get('ContentDocumentId')
        );
      }

      List<ContentDocumentLink> contentDocLinks = new List<ContentDocumentLink>();
      for (Integer i = 0; i < wrapperList.size(); i++) {
        String contentVersionId = recordIdMappedWithContentDocument.get(
          wrapperList[i].Id
        );
        String contentDocumentId = convertListIntoMap.get(contentVersionId);
        contentDocLinks.add(
          new ContentDocumentLink(
            Id = wrapperList[i].contentDocumentLinkRecordId,
            ContentDocumentId = contentDocumentId,
            LinkedEntityId = wrapperList[i].Id,
            ShareType = 'V',
            visibility = 'AllUsers'
          )
        );
      }
      systemCtx.upsertRecords((List<SObject>) contentDocLinks);
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}

/**
 * @description       :
 * @author            : Anuja Dadheech
 * @group             :
 * @last modified on  : 07-25-2022
 * @last modified by  : Anuja Dadheech
 **/

public with sharing class FileUploadController {
  // Static variable to save the object of the without sharing inner class
  private static SystemContext systemCtx = new SystemContext();

  /**
   * @description File Wrapper class
   **/
  public class FileWrapper {
    @AuraEnabled
    public Sobject record;
    @AuraEnabled
    public String versionData;
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
    public void deleteSingleRecord(Id recordId) {
      Database.delete(recordId);
    }
    public Id upsertSingleRecord(SObject record) {
      Database.UpsertResult result = Database.upsert(record);
      return result.getId();
    }
  }

  /**
   *
   * @description Deletes File
   * @param recordToDelete (String) :  record Id to Delete
   *
   **/
  @AuraEnabled
  public static void deleteFile(String recordToDelete) {
    try {
      if (recordToDelete != null) {
        systemCtx.deleteSingleRecord(recordToDelete);
      }
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Upload files
   * @param base64  : String to be converted into base 64
   * @param filename  : filename
   * @param recordId  : recordId to add record
   **/
  @AuraEnabled
  public static void uploadFile(
    String base64,
    String filename,
    String recordId,
    String cvId,
    String cdlId
  ) {
    try {
      System.debug(base64);
      ContentVersion contentFile = new ContentVersion(
        Id = cvId,
        VersionData = EncodingUtil.base64Decode(base64),
        Title = filename,
        PathOnClient = filename,
        isMajorVersion = false
      );
      Id recId = systemCtx.upsertSingleRecord(contentFile);
      SObject contentFileRetreived = systemCtx.queryRecords(
          'Select Id,ContentDocumentId from ContentVersion where Id = \'' +
          recId +
          '\' LIMIT 1'
        )
        .get(0);
      ContentDocumentLink contentLinkRecord = new ContentDocumentLink(
        Id = cdlId,
        ContentDocumentId = (Id) contentFileRetreived.get('ContentDocumentId'),
        LinkedEntityId = recordId,
        ShareType = 'V',
        visibility = 'AllUsers'
      );
      systemCtx.upsertSingleRecord(contentLinkRecord);
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }

  /**
   * @description Get file details
   * @param recordId : recordId to get files
   * @return Wrapper : return respective record wrapper
   **/
  @AuraEnabled
  public static FileWrapper getFile(String recordId) {
    try {
      List<Sobject> records = systemCtx.queryRecords(
        'Select Id,ContentDocumentId from ContentDocumentLink where LinkedEntityId = \'' +
        recordId +
        '\' LIMIT 1'
      );
      SObject fileLinkedRecord = records.size() > 0 ? records.get(0) : null;
      if (fileLinkedRecord != null) {
        Sobject fileRecord = systemCtx.queryRecords(
            'Select Id , ContentDocumentId , VersionData , Title , FileType , ContentSize from ContentVersion where ContentDocumentId = \'' +
            fileLinkedRecord.get('ContentDocumentId') +
            '\' LIMIT 1'
          )
          .get(0);
        FileWrapper wr = new FileWrapper();
        wr.record = fileRecord;
        wr.contentDocumentId = (Id) fileLinkedRecord.get('ContentDocumentId');
        wr.contentDocumentLinkRecordId = (Id) fileLinkedRecord.get('Id');
        Blob data = (Blob) fileRecord.get('VersionData');
        wr.versionData = EncodingUtil.base64Encode(data);
        return wr;
      }
      return null;
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
}

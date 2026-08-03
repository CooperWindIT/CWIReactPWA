import { useState, useCallback, useEffect } from 'react';
import { parseDiagramJson } from './diagramUtils';   // ← replaces pdfUtils
import { fetchWithAuth } from '../../../utils/api';
import { BASE_DOCS_API_GET } from '../../Config/Config';
import LZString from "lz-string";
import Swal from 'sweetalert2';

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useFiles() {
  const [files, setFiles]               = useState([]);
  const [currentFileId, setCurrentFileId] = useState(null);
  const [draftFiles, setDraftFiles] = useState([]);
const [edmDocuments, setEdmDocuments] = useState([]);
 const [sessionUserData, setsessionUserData] = useState({});
 const [sharedDraftFiles, setSharedDraftFiles] = useState([]);

 useEffect(() => {
         const userDataString = sessionStorage.getItem("userData");
         if (userDataString) {
             const userData = JSON.parse(userDataString);
             setsessionUserData(userData);
         }
      }, []);

  // ── helpers ────────────────────────────────────────────────────────────────

  /** Upsert a file entry in local state (no server call). */
  const saveFile = useCallback((id, name, nodes, connections) => {
    setFiles((prev) => {
      const idx     = prev.findIndex((f) => f.id === id);
      const existing = idx >= 0 ? prev[idx] : null;

      const file = {
        id,
        name,
        nodes,
        connections,
        updatedAt : Date.now(),
        filename  : existing?.filename || null,
        url       : existing?.url      || null,
      };

      return idx >= 0
        ? prev.map((f) => (f.id === id ? file : f))
        : [file, ...prev];
    });
  }, []);

  /** Create a blank file entry and return it. */
  const newFile = useCallback(() => {
    const id   = `f${Date.now()}`;
    const file = {
      id,
      name        : 'Untitled diagram',
      nodes       : [],
      connections : [],
      updatedAt   : Date.now(),
      filename    : null,
      url         : null,
    };
    setFiles((prev) => [file, ...prev]);
    setCurrentFileId(id);
    return file;
  }, []);

  const getFile = useCallback(
    (id) => files.find((f) => f.id === id) || null,
    [files],
  );

  const deleteFile = useCallback(
    async (id) => {
      const result = await Swal.fire({
        title: "Delete Diagram?",
        text: "Are you sure you want to delete this diagram?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Yes, Delete",
        cancelButtonText: "No",
        reverseButtons: true,
      });
  
      if (!result.isConfirmed) return;
  
      try {
        const userData = JSON.parse(sessionStorage.getItem("userData"));
  
        const response = await fetchWithAuth("Design/InactiveDesignFile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            UserId: userData?.Id,
            FlowChartId: id,
          }),
        });
  
        if (!response.ok) {
          throw new Error("Failed to delete file.");
        }
  
        const data = await response.json();
  
        if (data?.ResultData?.Status === "Success") {
          setFiles((prev) => {
            const remaining = prev.filter((f) => f.id !== id);
  
            if (currentFileId === id) {
              setCurrentFileId(remaining[0]?.id || null);
            }
  
            return remaining;
          });
  
          Swal.fire({
            icon: "success",
            title: "Deleted!",
            text: "Diagram deleted successfully.",
            timer: 1500,
            showConfirmButton: false,
          });
          fetchBackendFiles();
        } else {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: data?.ResultData?.ResultMessage || "Unable to delete diagram.",
          });
        }
      } catch (error) {
        console.error("Delete failed:", error);
  
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Something went wrong while deleting the diagram.",
        });
      }
    },
    [currentFileId]
  );
  

  
  const fetchBackendFiles = useCallback(async () => {
    try {
      const response = await fetchWithAuth(
        `Design/MyDrafts?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}`,
        {
          method: "GET",
        }
      );
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data?.Message || "Failed to fetch drafts");
      }
  
      const drafts = data?.ResultData || [];
      
      const backendFiles = drafts.map((item) => {
        let diagram = {
          name: item.Filename,
          nodes: [],
          connections: [],
          savedAt: Date.now(),
        };
      
        try {
          const json = LZString.decompressFromBase64(item.JsonData);
            
          if (json) {
            diagram = JSON.parse(json);
          }
        } catch (e) {
          console.error("Failed to parse draft", e);
        }
      
        return {
          id: item.Id,
          name: diagram.name || item.Filename,
          filename: item.Filename,
          nodes: diagram.nodes || [],
          connections: diagram.connections || [],
          updatedAt: diagram.savedAt || Date.now(),
          isBackend: true,
          loaded: true,
          isBackendDraft: true,
          jsonData: item.JsonData,
        };
      });
      
      setDraftFiles(backendFiles);
  
      return backendFiles;
    } catch (err) {
      console.error("fetchBackendFiles:", err);
      return [];
    }
  }, [sessionUserData]);

  const saveFileWithJson = useCallback(
    async (id, name, nodes, connections) => {
      // Save locally first
      saveFile(id, name, nodes, connections);
  
      const existingDraft = draftFiles.find((f) => f.id === id);
  
      const diagram = {
        name,
        nodes,
        connections,
        savedAt: Date.now(),
        version: 1,
      };
  
      // Compress JSON
      const jsonString = JSON.stringify(diagram);
      const compressedJson = LZString.compressToBase64(jsonString);
  
      const isEdit = !!existingDraft;
  
      const endpoint = isEdit
        ? "Design/EditDrafts"
        : "Design/CreateDraft";
  
      const payload = isEdit
        ? {
            Id: id,
            UserId: sessionUserData?.Id,
            FileName: name,
            JsonData: compressedJson,
          }
        : {
            UserId: sessionUserData?.Id,
            OrgId: sessionUserData?.OrgId,
            FileName: name,
            JsonData: compressedJson,
          };
  
      try {
        const response = await fetchWithAuth(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });
  
        const result = await response.json();
  
        if (!response.ok) {
          throw new Error(result?.Message || "Failed to save draft");
        }
  
        if (isEdit) {
          // Update existing backend draft locally
          setDraftFiles((prev) =>
            prev.map((file) =>
              file.id === id
                ? {
                    ...file,
                    name,
                    filename: name,
                    nodes,
                    connections,
                    updatedAt: Date.now(),
                    loaded: true,
                  }
                : file
            )
          );
        } else {
          // New draft -> refresh list to get DB Id
          fetchBackendFiles();
        }
  
        // Update local files list
        setFiles((prev) =>
          prev.map((file) =>
            file.id === id
              ? {
                  ...file,
                  name,
                  updatedAt: Date.now(),
                  draftId: result?.ResultData?.Id ?? file.draftId,
                }
              : file
          )
        );
        
        fetchBackendFiles();
        return result;
      } catch (err) {
        console.error("saveFileWithJson:", err);
        return null;
      }
    },
    [saveFile, draftFiles, sessionUserData, fetchBackendFiles]
  );

  /**
   * Fetches the .json file from the server URL and returns a complete file
   * object with nodes + connections populated.
   *
   * Called after saving (to refresh) or when the user picks a file.
   */
  const loadFileFromServer = useCallback(
    async (fileId) => {
      const file = draftFiles.find((f) => f.id === fileId);
  
      if (!file) return null;
  
      setCurrentFileId(fileId);
  
      return {
        ...file,
        loaded: true,
      };
    },
    [draftFiles]
  );


const fetchEDMDocuments = useCallback(async (masterTypeId = 0) => {
  try {
    const url =
      `Design/EDMflowCharts?OrgId=${sessionUserData?.OrgId}` +
      `&TypeId=${masterTypeId}`;

    const response = await fetchWithAuth(url, {
      method: "GET",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.Message || "Failed to fetch documents");
    }
    
    // const documents = (result?.ResultData || []).map((item) => ({
    //   id: item.Id,
    //   type: "document",
    //   name: item.DocName,
    //   filename: item.FileName,
    //   url: `${BASE_DOCS_API_GET}${item.FileUrl}`,
    //   uploadedOn: item.UploadedOn,
    //   uploadedBy: item.Name,
    //   shared: false,
    //   isBackend: true,
    //   loaded: true,
    //   isBackendDocument: true,
    //   jsonData: item.JsonData
    // }));
    const documents = result.ResultData.map((item, index) => {    
      return {
        id: item.Id,
        type: "document",
        name: item.DocName,
        filename: item.FileName,
        url: `${BASE_DOCS_API_GET}${item.FileUrl}`,
        CreatedOn: item.UploadedOn,
        uploadedBy: item.Name,
        shared: false,
        isBackend: true,
        loaded: true,
        isBackendDocument: true,
        JsonData: item.JsonData,
        ContentTypeId: item.ContentTypeId,
        Id: item.Id,
        DocName: item.DocName,
        TypeName: item.TypeName,
        CurrentVersion: item.CurrentVersion,
        VersionStatus: item.VersionStatus,
        ExpiryDate: item.ExpiryDate,
        FlowChartId: item.FlowChartId,
        VersionId: item.VersionId,
      };
    });

    setEdmDocuments(documents);

    return documents;
  } catch (err) {
    console.error("fetchEDMDocuments:", err);
    setEdmDocuments([]);
    return [];
  }
}, [sessionUserData]);



const fetchSharedDrafts = useCallback(async () => {
  try {
    const url = `Design/SharedDrafts?OrgId=${sessionUserData?.OrgId}&UserId=${sessionUserData?.Id}`;

    const response = await fetchWithAuth(url, {
      method: "GET",
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.Message || "Failed to fetch shared drafts");
    }

    const drafts = (result?.ResultData || []).map((item) => ({
      id: item.Id,
      name: item.FileName,
      filename: item.FileUrl,
      url: `${BASE_DOCS_API_GET}${item.FileUrl}`,
      updatedAt: item.SharedOn || item.CreatedOn || new Date().toISOString(),
      shared: item.SharedBy,
      loaded: true,
      isBackend: true,
      isWrite: item.IsWrite,
    }));

    setSharedDraftFiles(drafts);

    return drafts;
  } catch (err) {
    console.error("fetchSharedDrafts:", err);
    setSharedDraftFiles([]);
    return [];
  }
}, [sessionUserData]);

const loadDiagramFromUrl = useCallback(async (url) => {
  try {
      const response = await fetch(url);

      if (!response.ok) {
          throw new Error("Failed to fetch diagram");
      }

      const text = await response.text();
      const diagram = parseDiagramJson(text);

      return {
          name: diagram.name,
          nodes: diagram.nodes || [],
          connections: diagram.connections || [],
          updatedAt: diagram.savedAt || Date.now(),
      };
  } catch (err) {
      console.error(err);
      return null;
  }
}, []);

return {
  files,
  draftFiles,
  edmDocuments,
  sharedDraftFiles,
  loadDiagramFromUrl,
  // loadDiagram,

  currentFileId,
  setCurrentFileId,
  saveFile,
  saveFileWithPdf: saveFileWithJson,
  newFile,
  getFile,
  deleteFile,
  loadFileFromServer,
  fetchBackendFiles,
  fetchSharedDrafts,
  fetchEDMDocuments,
  loadFileFromBackend: loadFileFromServer,
};
}

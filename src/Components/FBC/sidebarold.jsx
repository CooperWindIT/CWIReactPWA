// // import React, { useState } from 'react';
// // import styles from './Sidebar.module.css';
// // import { CloudDownloadOutlined, DeleteOutlined, DownloadOutlined, CloudUploadOutlined  } from '@ant-design/icons';
// // import { exportDiagramAsPdf } from './hooks/pdfUtils';   // ✅ import
// // import UplaodDocument from '../EDM/Documents/UploadDoc';

// // const FILL_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];

// // function fmt(ts) {
// //   const date = new Date(ts);
// //   return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
// // }

// // const MenuIcon = () => (
// //   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
// //     <path d="M4 7h16" />
// //     <path d="M4 12h16" />
// //     <path d="M4 17h16" />
// //   </svg>
// // );

// // const FolderIcon = () => (
// //   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
// //     <path d="M3 6h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
// //   </svg>
// // );

// // const SunIcon = () => (
// //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
// //     <circle cx="12" cy="12" r="4" />
// //     <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
// //   </svg>
// // );

// // const MoonIcon = () => (
// //   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
// //     <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
// //   </svg>
// // );

// // export default function Sidebar({
// //   open,
// //   onToggle,
// //   files,
// //   currentFileId,
// //   onNewFile,
// //   onLoadFile,
// //   onDeleteFile,
// //   onGetFileData,
// //   theme,
// //   onThemeChange,
// //   showGrid,
// //   handleGridToggle,
// //   autoArrowEnabled,
// //   onToggleAutoArrow,
// //   onChangeCanvasBg,
// //   onUploadToEdm,
// // }) 
// // {
// //   const [exportMenuFileId, setExportMenuFileId] = useState(null);
// //   const [exporting, setExporting] = useState(false);

// //   const handleDownloadLocal = async (file) => {
// //     setExporting(true);
// //     setExportMenuFileId(null);
// //     try {
// //       // Get latest nodes+connections for this file
// //       const data = onGetFileData(file.id);
// //       const doc = await exportDiagramAsPdf({
// //         name: file.name || 'diagram',
// //         nodes: data?.nodes || file.nodes || [],
// //         connections: data?.connections || file.connections || [],
// //       });
// //       doc.save(`${file.name || 'diagram'}.pdf`);
// //     } catch (e) {
// //       console.error('Export failed:', e);
// //     }
// //     setExporting(false);
// //   };
// //   return (
// //     <>
    
// //       <button type="button" className={styles.menuButton} onClick={onToggle} aria-label="Open menu">
// //         <MenuIcon />
// //       </button>

// //       {open && <button type="button" className={styles.backdrop} onClick={onToggle} aria-label="Close menu" />}

// //       <aside className={[styles.drawer, open ? styles.open : ''].join(' ')}>
// //         <div className={styles.section}>
// //           <div className={styles.sectionTitle}>Files</div>

// //           <button type="button" className={styles.primaryAction} onClick={onNewFile}>
// //             <FolderIcon />
// //             <span>New diagram</span>
// //           </button>

// //           <div className={styles.fileList}>
// //             {files.length === 0 && <div className={styles.empty}>No saved files yet</div>}

// //             {files.map((file) => (
// //               <div
// //                 key={file.id}
// //                 className={[styles.fileItem, currentFileId === file.id ? styles.fileItemActive : ''].join(' ')}
// //                 style={{ position: 'relative' }}
// //               >
// //                 <button
// //                   type="button"
// //                   className={styles.fileMain}
// //                   onClick={() => { onLoadFile(file.id); onToggle(); }}
// //                 >
// //                   <span className={styles.fileName}>{file.name || 'Untitled diagram'}</span>
// //                   <span className={styles.fileMeta}>{fmt(file.updatedAt)}</span>
// //                 </button>

// //                 <button
// //                   type="button"
// //                   className={styles.iconButton}
// //                   onClick={() => onDeleteFile(file.id)}
// //                   aria-label="Delete file"
// //                 >
// //                   <DeleteOutlined />
// //                 </button>

// //                 {/* ✅ Export button with popup */}
// //                 <button
// //                   type="button"
// //                   className={styles.iconButton}
// //                   aria-label="Export file"
// //                   onClick={() => setExportMenuFileId(exportMenuFileId === file.id ? null : file.id)}
// //                 >
// //                   <CloudDownloadOutlined />
// //                 </button>

// //                 {/* ✅ Export popup menu */}
// //                 {exportMenuFileId === file.id && (
// //                   <div className={styles.exportMenu}>
// //                     <button
// //                       type="button"
// //                       className={styles.exportMenuItem}
// //                       onClick={() => handleDownloadLocal(file)}
// //                       disabled={exporting}
// //                     >
// //                       <DownloadOutlined style={{ marginRight: 6 }} />
// //                       {exporting ? 'Exporting...' : 'Download to Local'}
// //                     </button>
// //                     <button
// //   type="button"
// //   className={styles.exportMenuItem}
// //   onClick={() => {
// //     setExportMenuFileId(null);
// //     onUploadToEdm(file);  // ✅ use the prop directly, not handleUploadToEdm
// //   }}
// // >
// //   <CloudUploadOutlined style={{ marginRight: 6 }} />
// //   Upload to EDM
// // </button>
// //                   </div>
// //                 )}
// //               </div>
// //             ))}
// //           </div>
// //         </div>

// //         <div className={styles.section}>
// //           <div className={styles.sectionTitle}>Theme</div>

// //           <div className={styles.themeRow}>
// //             <button
// //               type="button"
// //               className={[styles.themeBtn, theme === 'light' ? styles.themeBtnActive : ''].join(' ')}
// //               onClick={() => onThemeChange('light')}
// //             >
// //               <SunIcon />
// //               <span>Light</span>
// //             </button>

// //             <button
// //               type="button"
// //               className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
// //               onClick={() => onThemeChange('dark')}
// //             >
// //               <MoonIcon />
// //               <span>Dark</span>
// //             </button>
// //           </div>
// //         </div>

// //         <div className={styles.section}>
// //           <button type="button" className={styles.toggleRow} onClick={handleGridToggle}>
// //             <span>Grid</span>
// //             <span className={[styles.toggleCheck, showGrid ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
// //           </button>
// //         </div>

// //         <div className={styles.section}>
// //           <button type="button" className={styles.toggleRow} onClick={onToggleAutoArrow}>
// //             <span>Auto Arrow</span>
// //             <span className={[styles.toggleCheck, autoArrowEnabled ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
// //           </button>
// //         </div>

// //         <div className={styles.section}>
// //           <div className={styles.bgSection}>
// //             <div className={styles.bgLabel}>Canvas Background</div>

// //             <div className={styles.bgSwatches}>
// //               {FILL_COLORS.map((color) => (
// //                 <button
// //                   key={color}
// //                   className={[
// //                     styles.bgSwatch,
// //                     color === 'transparent' ? styles.bgSwatchTransparent : '',
// //                   ].join(' ')}
// //                   style={color !== 'transparent' ? { background: color } : undefined}
// //                   onClick={() => onChangeCanvasBg(color === 'transparent' ? 'transparent' : color)}
// //                 />
// //               ))}
// //             </div>
// //           </div>
// //         </div>
// //       </aside>
// //     </>
// //   );
// // }

// import React, { useState } from 'react';
// import styles from './Sidebar.module.css';
// import { CloudDownloadOutlined, DeleteOutlined, DownloadOutlined, CloudUploadOutlined  } from '@ant-design/icons';
// import { exportDiagramAsPdf } from './hooks/pdfUtils';   // ✅ import
// import UplaodDocument from '../EDM/Documents/UploadDoc';

// const FILL_COLORS = ['transparent', '#fdeaea', '#d3f9d8', '#d0ebff', '#fff3bf', '#e5dbff'];

// const TABS = [
//   { id: 'mine', label: 'My Drafts' },
//   { id: 'shared', label: 'Shared Drafts' },
//   { id: 'documents', label: 'Documents' },
// ];

// function fmt(ts) {
//   const date = new Date(ts);
//   return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
// }

// // Assumption: files without a `shared` flag and without type === 'document'
// // are treated as "My Drafts". Adjust this predicate once your file objects
// // carry real ownership/sharing/document metadata.
// function getFileTab(file) {
//   if (file.type === 'document') return 'documents';
//   if (file.shared) return 'shared';
//   return 'mine';
// }

// const MenuIcon = () => (
//   <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
//     <path d="M4 7h16" />
//     <path d="M4 12h16" />
//     <path d="M4 17h16" />
//   </svg>
// );

// const FolderIcon = () => (
//   <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M3 6h5l2 2h11v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" />
//   </svg>
// );

// const SunIcon = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
//     <circle cx="12" cy="12" r="4" />
//     <path d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
//   </svg>
// );

// const MoonIcon = () => (
//   <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//     <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
//   </svg>
// );

// export default function Sidebar({
//   open,
//   onToggle,
//   files,
//   currentFileId,
//   onNewFile,
//   onLoadFile,
//   onDeleteFile,
//   onGetFileData,
//   theme,
//   onThemeChange,
//   showGrid,
//   handleGridToggle,
//   autoArrowEnabled,
//   onToggleAutoArrow,
//   onChangeCanvasBg,
//   onUploadToEdm,
// })
// {
//   const [exportMenuFileId, setExportMenuFileId] = useState(null);
//   const [exporting, setExporting] = useState(false);
//   const [activeTab, setActiveTab] = useState('mine');

//   const visibleFiles = files.filter((file) => getFileTab(file) === activeTab);

//   const handleDownloadLocal = async (file) => {
//     setExporting(true);
//     setExportMenuFileId(null);
//     try {
//       // Get latest nodes+connections for this file
//       const data = onGetFileData(file.id);
//       const doc = await exportDiagramAsPdf({
//         name: file.name || 'diagram',
//         nodes: data?.nodes || file.nodes || [],
//         connections: data?.connections || file.connections || [],
//       });
//       doc.save(`${file.name || 'diagram'}.pdf`);
//     } catch (e) {
//       console.error('Export failed:', e);
//     }
//     setExporting(false);
//   };
//   return (
//     <>

//       <button type="button" className={styles.menuButton} onClick={onToggle} aria-label="Open menu">
//         <MenuIcon />
//       </button>

//       {open && <button type="button" className={styles.backdrop} onClick={onToggle} aria-label="Close menu" />}

//       <aside className={[styles.drawer, open ? styles.open : ''].join(' ')}>
//         <div className={styles.section}>
//           <div className={styles.sectionTitle}>Files</div>

//           <button type="button" className={styles.primaryAction} onClick={onNewFile}>
//             <FolderIcon />
//             <span>Create New</span>
//           </button>

//           <div className={styles.tabRow} role="tablist">
//             {TABS.map((tab) => (
//               <button
//                 key={tab.id}
//                 type="button"
//                 role="tab"
//                 aria-selected={activeTab === tab.id}
//                 className={[styles.tabBtn, activeTab === tab.id ? styles.tabBtnActive : ''].join(' ')}
//                 onClick={() => setActiveTab(tab.id)}
//               >
//                 {tab.label}
//               </button>
//             ))}
//           </div>

//           <div className={styles.fileList}>
//             {visibleFiles.length === 0 && (
//               <div className={styles.empty}>
//                 {activeTab === 'mine' && 'No saved files yet'}
//                 {activeTab === 'shared' && 'No shared drafts yet'}
//                 {activeTab === 'documents' && 'No documents yet'}
//               </div>
//             )}

//             {visibleFiles.map((file) => (
//               <div
//                 key={file.id}
//                 className={[styles.fileItem, currentFileId === file.id ? styles.fileItemActive : ''].join(' ')}
//                 style={{ position: 'relative' }}
//               >
//                 <button
//                   type="button"
//                   className={styles.fileMain}
//                   onClick={() => { onLoadFile(file.id); onToggle(); }}
//                 >
//                   <span className={styles.fileName}>{file.name || 'Untitled diagram'}</span>
//                   <span className={styles.fileMeta}>{fmt(file.updatedAt)}</span>
//                 </button>

//                 <button
//                   type="button"
//                   className={styles.iconButton}
//                   onClick={() => onDeleteFile(file.id)}
//                   aria-label="Delete file"
//                 >
//                   <DeleteOutlined />
//                 </button>

//                 {/* ✅ Export button with popup */}
//                 <button
//                   type="button"
//                   className={styles.iconButton}
//                   aria-label="Export file"
//                   onClick={() => setExportMenuFileId(exportMenuFileId === file.id ? null : file.id)}
//                 >
//                   <CloudDownloadOutlined />
//                 </button>

//                 {/* ✅ Export popup menu */}
//                 {exportMenuFileId === file.id && (
//                   <div className={styles.exportMenu}>
//                     <button
//                       type="button"
//                       className={styles.exportMenuItem}
//                       onClick={() => handleDownloadLocal(file)}
//                       disabled={exporting}
//                     >
//                       <DownloadOutlined style={{ marginRight: 6 }} />
//                       {exporting ? 'Exporting...' : 'Download to Local'}
//                     </button>
//                     <button
//   type="button"
//   className={styles.exportMenuItem}
//   onClick={() => {
//     setExportMenuFileId(null);
//     onUploadToEdm(file);  // ✅ use the prop directly, not handleUploadToEdm
//   }}
// >
//   <CloudUploadOutlined style={{ marginRight: 6 }} />
//   Upload to EDM
// </button>
//                   </div>
//                 )}
//               </div>
//             ))}
//           </div>
//         </div>

//         <div className={styles.section}>
//           <div className={styles.sectionTitle}>Theme</div>

//           <div className={styles.themeRow}>
//             <button
//               type="button"
//               className={[styles.themeBtn, theme === 'light' ? styles.themeBtnActive : ''].join(' ')}
//               onClick={() => onThemeChange('light')}
//             >
//               <SunIcon />
//               <span>Light</span>
//             </button>

//             <button
//               type="button"
//               className={[styles.themeBtn, theme === 'dark' ? styles.themeBtnActive : ''].join(' ')}
//               onClick={() => onThemeChange('dark')}
//             >
//               <MoonIcon />
//               <span>Dark</span>
//             </button>
//           </div>
//         </div>

//         <div className={styles.section}>
//           <button type="button" className={styles.toggleRow} onClick={handleGridToggle}>
//             <span>Grid</span>
//             <span className={[styles.toggleCheck, showGrid ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
//           </button>
//         </div>

//         <div className={styles.section}>
//           <button type="button" className={styles.toggleRow} onClick={onToggleAutoArrow}>
//             <span>Auto Arrow</span>
//             <span className={[styles.toggleCheck, autoArrowEnabled ? styles.toggleCheckActive : ''].join(' ')}>OK</span>
//           </button>
//         </div>

//         <div className={styles.section}>
//           <div className={styles.bgSection}>
//             <div className={styles.bgLabel}>Canvas Background</div>

//             <div className={styles.bgSwatches}>
//               {FILL_COLORS.map((color) => (
//                 <button
//                   key={color}
//                   className={[
//                     styles.bgSwatch,
//                     color === 'transparent' ? styles.bgSwatchTransparent : '',
//                   ].join(' ')}
//                   style={color !== 'transparent' ? { background: color } : undefined}
//                   onClick={() => onChangeCanvasBg(color === 'transparent' ? 'transparent' : color)}
//                 />
//               ))}
//             </div>
//           </div>
//         </div>
//       </aside>
//     </>
//   );
// }
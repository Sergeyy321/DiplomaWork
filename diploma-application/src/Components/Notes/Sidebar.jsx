import React, { useState } from "react";
import { Home, FileText, Star, Settings, Plus } from "lucide-react";
import "./Sidebar.css";

const menuItems = [
  { id: 1, label: "Home", icon: Home },
  { id: 2, label: "Notes", icon: FileText, hasDropdown: true },
  { id: 3, label: "Favorites", icon: Star },
  { id: 4, label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [active, setActive] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);

  const [folders, setFolders] = useState([]);
  const [globalNotes, setGlobalNotes] = useState([]);

  const [newFolder, setNewFolder] = useState("");
  const [newNote, setNewNote] = useState("");

  // 📌 toggle notes menu
  const toggleNotes = () => {
    setNotesOpen((prev) => !prev);
  };

  // 📁 create folder
  const addFolder = () => {
    if (!newFolder.trim()) return;

    setFolders((prev) => [
      ...prev,
      { id: Date.now(), name: newFolder, folders: [], notes: [] },
    ]);

    setNewFolder("");
  };

  // 📝 global note
  const addGlobalNote = () => {
    if (!newNote.trim()) return;
    setGlobalNotes((prev) => [...prev, newNote]);
    setNewNote("");
  };

  // 🗑 delete global note
  const deleteGlobalNote = (index) => {
    setGlobalNotes((prev) => prev.filter((_, i) => i !== index));
  };

  // 🗑 delete folder (recursive)
  const deleteFolder = (tree, id) => {
    return tree
      .filter((f) => f.id !== id)
      .map((f) => ({
        ...f,
        folders: deleteFolder(f.folders, id),
      }));
  };

  const handleDeleteFolder = (id) => {
    setFolders((prev) => deleteFolder(prev, id));
  };

  // 🗑 delete note inside folders (recursive)
  const deleteNoteFromFolder = (tree, folderId, noteIndex) => {
    return tree.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          notes: f.notes.filter((_, i) => i !== noteIndex),
        };
      }

      return {
        ...f,
        folders: deleteNoteFromFolder(f.folders, folderId, noteIndex),
      };
    });
  };

  const handleDeleteNote = (folderId, index) => {
    setFolders((prev) => deleteNoteFromFolder(prev, folderId, index));
  };

  // ➕ add note to folder
  const addNoteToFolder = (tree, folderId, note) => {
    return tree.map((f) => {
      if (f.id === folderId) {
        return { ...f, notes: [...f.notes, note] };
      }

      return {
        ...f,
        folders: addNoteToFolder(f.folders, folderId, note),
      };
    });
  };

  const addNote = (folderId, note) => {
    if (!note.trim()) return;

    setFolders((prev) => addNoteToFolder(prev, folderId, note));
    setNewNote("");
  };

  return (
    <aside className="sidebar">
      <h1 className="logo">App Name</h1>

      <nav className="menu">
        {menuItems.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.id} className="menu-wrapper">
              <button
                className={`menu-item ${
                  active === item.id ? "active" : ""
                }`}
                onClick={() => {
                  setActive(item.id);
                  if (item.hasDropdown) toggleNotes();
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>

              {/* 📁 NOTES PANEL */}
              {item.hasDropdown && notesOpen && (
                <div className="dropdown">

                  {/* 📝 GLOBAL NOTES */}
                  <div className="section-title">Notes (no folder)</div>

                  {globalNotes.map((note, i) => (
                    <div key={i} className="dropdown-item">
                      📝 {note}
                      <button onClick={() => deleteGlobalNote(i)}>
                        🗑
                      </button>
                    </div>
                  ))}

                  <div className="add-note">
                    <input
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="New note..."
                    />
                    <button onClick={addGlobalNote}>
                      <Plus size={14} />
                    </button>
                  </div>

                  <hr />

                  {/* 📁 FOLDERS */}
                  <div className="section-title">Folders</div>

                  <div className="add-note">
                    <input
                      value={newFolder}
                      onChange={(e) => setNewFolder(e.target.value)}
                      placeholder="New folder..."
                    />
                    <button onClick={addFolder}>
                      <Plus size={14} />
                    </button>
                  </div>

                  <FolderTree
                    folders={folders}
                    onDeleteFolder={handleDeleteFolder}
                    onDeleteNote={handleDeleteNote}
                    onAddNote={addNote}
                  />
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <button className="logout">Logout</button>
    </aside>
  );
}

/* 🌳 recursive tree */
function FolderTree({
  folders,
  onDeleteFolder,
  onDeleteNote,
  onAddNote,
}) {
  const [inputs, setInputs] = useState({});

  return (
    <div>
      {folders.map((folder) => (
        <div key={folder.id} style={{ marginLeft: 10 }}>
          <div className="folder-header">
            📁 {folder.name}

            <button onClick={() => onDeleteFolder(folder.id)}>
              🗑
            </button>
          </div>

          {/* notes */}
          {folder.notes.map((note, i) => (
            <div key={i} className="dropdown-item">
              📝 {note}
              <button onClick={() => onDeleteNote(folder.id, i)}>
                🗑
              </button>
            </div>
          ))}

          {/* add note */}
          <div className="add-note">
            <input
              value={inputs[folder.id] || ""}
              onChange={(e) =>
                setInputs({
                  ...inputs,
                  [folder.id]: e.target.value,
                })
              }
              placeholder="New note..."
            />
            <button
              onClick={() => {
                onAddNote(folder.id, inputs[folder.id]);
                setInputs({ ...inputs, [folder.id]: "" });
              }}
            >
              <Plus size={12} />
            </button>
          </div>

          {/* recursive folders */}
          <FolderTree
            folders={folder.folders}
            onDeleteFolder={onDeleteFolder}
            onDeleteNote={onDeleteNote}
            onAddNote={onAddNote}
          />
        </div>
      ))}
    </div>
  );
}
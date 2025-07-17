import React, { useState } from "react";
import type { JobApplicant } from "../types/jobApplicant";
import { useAddComment, useComments } from "../hooks/useJobApplicant";

interface NotesContentProps {
  applicant: JobApplicant;
}

const NotesContent: React.FC<NotesContentProps> = ({ applicant }) => {
  const [newNote, setNewNote] = useState("");
  const { data: comments = [], refetch } = useComments(applicant.name);
  const addCommentMutation = useAddComment();

  const handleAddNote = () => {
    if (!newNote.trim()) return;

    addCommentMutation.mutate(
      {
        content: newNote,
        reference_doctype: "Job Applicant",
        reference_name: applicant.name,
      },
      {
        onSuccess: () => {
          setNewNote("");
          refetch();
        },
        onError: (error) => {
          console.error("❌ Failed to post note:", error);
        },
      }
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="font-bold text-lg mb-4">Notes</h3>
      <div className="space-y-3 mb-4">
        {comments.length === 0 && (
          <p className="text-sm text-gray-500">No notes yet.</p>
        )}
        {comments
          .filter((note) => {
            const plainText = note.content.replace(/<[^>]*>?/gm, "").trim();
            return plainText && !note.content.includes("/files/");
          })
          .map((note) => {
            const cleanText = note.content.replace(/<[^>]*>?/gm, "").trim();
            return (
              <div
                key={note.name}
                className="p-3 bg-gray-100 rounded-md border text-sm"
              >
                <p>{cleanText}</p>
                <div className="text-xs text-gray-500 mt-1">
                  By {note.owner} on {new Date(note.creation).toLocaleString()}
                </div>
              </div>
            );
          })}
      </div>

      <div className="flex items-center gap-2">
        <input
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add a note..."
          className="flex-grow text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
        />
        <button
          onClick={handleAddNote}
          disabled={addCommentMutation.status === "pending"}
          className="bg-[var(--primary-color)] text-white px-4 py-2 text-sm rounded-md disabled:opacity-50"
        >
          {addCommentMutation.status === "pending" ? "Adding..." : "Add"}
        </button>
      </div>
    </div>
  );
};

export default NotesContent;

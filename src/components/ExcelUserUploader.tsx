import React, { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { User, Universe } from "../types/auth";
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Users,
  X,
  Shuffle,
  Info
} from "lucide-react";

interface ParsedUserRow {
  name: string;
  email: string;
  password: string;
  role: "player" | "instructor" | "admin";
  teamI: number; // -1 for unassigned pool, 0-9 for Teams 1-10
  isValid: boolean;
  statusMsg: string;
}

interface ExcelUserUploaderProps {
  universe: Universe;
  currentUser: User;
  existingUsers: User[];
  onUsersImported: (newUsers: User[]) => void;
}

export const ExcelUserUploader: React.FC<ExcelUserUploaderProps> = ({
  universe,
  currentUser,
  existingUsers,
  onUsersImported
}) => {
  const [parsedRows, setParsedRows] = useState<ParsedUserRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Excel Template for Admin
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        "Full Name": "Aarav Sharma",
        "Email Address": "aarav.sharma@nitw.ac.in",
        "Password": "studentPass123",
        "Role (player/instructor/admin)": "player",
        "Team Number (1-10 or leave blank)": 1
      },
      {
        "Full Name": "Bhavna Patel",
        "Email Address": "bhavna.patel@nitw.ac.in",
        "Password": "studentPass123",
        "Role (player/instructor/admin)": "player",
        "Team Number (1-10 or leave blank)": 1
      },
      {
        "Full Name": "Chirag Gupta",
        "Email Address": "chirag.gupta@nitw.ac.in",
        "Password": "studentPass123",
        "Role (player/instructor/admin)": "player",
        "Team Number (1-10 or leave blank)": ""
      },
      {
        "Full Name": "Divya Reddy",
        "Email Address": "divya.reddy@nitw.ac.in",
        "Password": "studentPass123",
        "Role (player/instructor/admin)": "player",
        "Team Number (1-10 or leave blank)": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    worksheet["!cols"] = [
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 28 },
      { wch: 32 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users_Import_Template");
    XLSX.writeFile(workbook, "EVLeague_User_Import_Template.xlsx");
  };

  // Process Excel / CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const buffer = evt.target?.result;
        if (!buffer) return;

        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          setErrorMsg("The uploaded spreadsheet is empty or corrupted.");
          return;
        }

        // Convert to JSON array of objects
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
          defval: ""
        });

        if (rawJson.length === 0) {
          setErrorMsg("No data rows found in the spreadsheet.");
          return;
        }

        // Helper to find field value across common column aliases
        const findVal = (row: Record<string, any>, aliases: string[]): string => {
          const keys = Object.keys(row);
          // 1. Exact match
          for (const alias of aliases) {
            const cleanAlias = alias.toLowerCase().trim();
            const matchedKey = keys.find((k) => k.toLowerCase().trim() === cleanAlias);
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== "") {
              return String(row[matchedKey]).trim();
            }
          }
          // 2. Substring / partial match (e.g. "Team Number (1-10 or leave blank)" contains "team number")
          for (const alias of aliases) {
            const cleanAlias = alias.toLowerCase().trim();
            const matchedKey = keys.find((k) => {
              const cleanK = k.toLowerCase().trim();
              return cleanK.includes(cleanAlias) || cleanAlias.includes(cleanK);
            });
            if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && String(row[matchedKey]).trim() !== "") {
              return String(row[matchedKey]).trim();
            }
          }
          return "";
        };

        const existingEmails = new Set(
          existingUsers.map((u) => u.email.toLowerCase().trim())
        );

        const rows: ParsedUserRow[] = rawJson.map((row) => {
          const email = findVal(row, [
            "email address",
            "email",
            "e-mail",
            "mail",
            "username",
            "student email",
            "user email"
          ]).toLowerCase();

          const name =
            findVal(row, ["full name", "name", "student name", "user name", "student", "first name"]) ||
            (email ? email.split("@")[0] : "Student User");

          const password =
            findVal(row, ["password", "pass", "pwd", "secret"]) || "student123";

          const rawRole = findVal(row, ["role (player/instructor/admin)", "role", "user role", "type"]).toLowerCase();
          let role: "player" | "instructor" | "admin" = "player";
          if (rawRole.includes("admin")) role = "admin";
          else if (rawRole.includes("inst")) role = "instructor";

          const rawTeam = findVal(row, [
            "team number (1-10 or leave blank)",
            "team number",
            "team no",
            "team no.",
            "team #",
            "team id",
            "team name",
            "team",
            "group",
            "group no",
            "group number",
            "group name",
            "assigned team",
            "team_number",
            "team_id",
            "team_no"
          ]);

          let teamI = -1; // Unassigned pool by default
          if (rawTeam !== "") {
            const strVal = String(rawTeam).trim();
            const lowerVal = strVal.toLowerCase();

            // Check 1: Match team names in universe.gameState.teams
            const availableTeams = universe?.gameState?.teams || [];
            const matchedIdx = availableTeams.findIndex((t) => {
              const tName = t.name.toLowerCase().trim();
              return tName === lowerVal || lowerVal.includes(tName) || tName.includes(lowerVal);
            });

            if (matchedIdx !== -1) {
              teamI = matchedIdx;
            } else {
              // Check 2: Extract integer/number
              const floatNum = parseFloat(strVal);
              if (!isNaN(floatNum) && floatNum >= 1 && floatNum <= 10 && Number.isInteger(floatNum)) {
                teamI = floatNum - 1;
              } else {
                const digitsOnly = strVal.replace(/\D/g, "");
                if (digitsOnly !== "") {
                  const parsedNum = parseInt(digitsOnly, 10);
                  if (parsedNum >= 1 && parsedNum <= 10) {
                    teamI = parsedNum - 1; // 1-based (Team 1 -> index 0)
                  } else if (parsedNum === 0) {
                    teamI = 0; // 0-based
                  }
                }
              }
            }
          }

          let isValid = true;
          let statusMsg = "Ready for import";

          if (!email || !email.includes("@")) {
            isValid = false;
            statusMsg = "Invalid Email address";
          } else if (existingEmails.has(email)) {
            isValid = false;
            statusMsg = "Email already exists in system";
          }

          return {
            name,
            email,
            password,
            role,
            teamI,
            isValid,
            statusMsg
          };
        });

        setParsedRows(rows);
        setIsPreviewOpen(true);
      } catch (err: any) {
        console.error("Error parsing spreadsheet:", err);
        setErrorMsg("Failed to parse file. Please ensure it is a valid .xlsx or .csv file.");
      }
    };

    reader.readAsArrayBuffer(file);

    // Reset input so re-uploading same file works
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Confirm Import
  const handleConfirmImport = () => {
    const validRows = parsedRows.filter((r) => r.isValid);
    if (validRows.length === 0) {
      setErrorMsg("No valid new users to import.");
      return;
    }

    const newUsers: User[] = validRows.map((r, idx) => ({
      id: "usr_" + Date.now() + "_" + idx,
      email: r.email,
      name: r.name,
      role: r.role,
      institution: currentUser.institution || "NIT Warangal",
      universeId: universe.id,
      teamI: r.teamI, // -1 if unassigned
      password: r.password
    }));

    onUsersImported(newUsers);
    setIsPreviewOpen(false);
    setParsedRows([]);
    setFileName("");
  };

  const handleRowTeamChange = (index: number, newTeamI: number) => {
    setParsedRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, teamI: newTeamI } : r))
    );
  };

  const handleAutoDistributeRows = () => {
    let validIndex = 0;
    const maxTeams = universe?.maxTeams || 10;
    setParsedRows((prev) =>
      prev.map((r) => {
        if (!r.isValid) return r;
        const assignedTeamI = validIndex % maxTeams;
        validIndex++;
        return { ...r, teamI: assignedTeamI };
      })
    );
  };

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="bg-white p-5 rounded-2xl border border-[#E5E1D8] shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E0DCD3]">
        <div>
          <h3 className="text-sm font-bold text-[#1F2022] flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Excel / CSV Batch User Import
          </h3>
          <p className="text-xs text-[#5A5C60] mt-0.5">
            Upload student spreadsheets containing emails and passwords. Users can be assigned directly to teams or added to the <strong>Unassigned Pool</strong> for later placement.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-slate-100 text-[#1F2022] border border-[#E0DCD3] rounded-xl text-xs font-mono font-semibold transition flex items-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-indigo-600" /> Excel Template (.xlsx)
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <label className="flex-1 w-full flex items-center justify-center gap-2 p-4 bg-[#FAF8F5] hover:bg-slate-100 border-2 border-dashed border-[#E0DCD3] rounded-2xl cursor-pointer transition text-center">
          <Upload className="w-5 h-5 text-indigo-600" />
          <div className="text-xs">
            <span className="font-bold text-indigo-700">Click to upload Excel spreadsheet</span>
            <span className="text-[#5A5C60] font-mono ml-1">(.xlsx, .xls, .csv)</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {/* Batch Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E5E1D8] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-[#1F2022] text-white flex items-center justify-between border-b border-slate-700">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                <div>
                  <h3 className="font-bold text-sm">Spreadsheet Import Preview</h3>
                  <span className="text-[11px] text-slate-300 font-mono">{fileName}</span>
                </div>
              </div>

              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Bar */}
            <div className="p-3 bg-[#FAF8F5] border-b border-[#E0DCD3] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-[#1F2022]">
                  Total Parsed: <strong>{parsedRows.length}</strong>
                </span>
                <span className="text-emerald-700 font-bold">
                  Valid for Import: <strong>{validCount}</strong>
                </span>
                {invalidCount > 0 && (
                  <span className="text-red-600 font-bold">
                    Skipped (Duplicates/Invalid): <strong>{invalidCount}</strong>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleAutoDistributeRows}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
              >
                <Shuffle className="w-3.5 h-3.5 text-indigo-600" /> Auto-Distribute Valid Users Across Teams
              </button>
            </div>

            {/* Table Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              <table className="w-full text-left text-xs font-sans border-collapse">
                <thead>
                  <tr className="border-b border-[#E0DCD3] text-[11px] font-mono text-[#5A5C60] uppercase">
                    <th className="p-2">#</th>
                    <th className="p-2">Name</th>
                    <th className="p-2">Email</th>
                    <th className="p-2">Password</th>
                    <th className="p-2">Role</th>
                    <th className="p-2">Assigned Team (Editable)</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E0DCD3] font-mono">
                  {parsedRows.map((row, i) => (
                    <tr
                      key={i}
                      className={row.isValid ? "hover:bg-[#FAF8F5]" : "bg-red-50 text-[#5A5C60]"}
                    >
                      <td className="p-2 text-[#5A5C60]">{i + 1}</td>
                      <td className="p-2 font-sans font-medium text-[#1F2022]">
                        {row.name}
                      </td>
                      <td className="p-2 text-indigo-700">{row.email}</td>
                      <td className="p-2 text-[#5A5C60]">••••••••</td>
                      <td className="p-2 uppercase text-[10px] font-bold">
                        <span
                          className={`px-2 py-0.5 rounded ${
                            row.role === "admin"
                              ? "bg-amber-100 text-amber-800"
                              : row.role === "instructor"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {row.role}
                        </span>
                      </td>
                      <td className="p-2">
                        <select
                          value={row.teamI}
                          onChange={(e) => handleRowTeamChange(i, Number(e.target.value))}
                          disabled={!row.isValid}
                          className="bg-white border border-[#E0DCD3] rounded-lg px-2 py-1 text-xs font-mono font-bold text-[#1F2022] shadow-2xs focus:outline-none focus:ring-1 focus:ring-indigo-600 cursor-pointer disabled:opacity-50"
                        >
                          <option value={-1}>Unassigned Pool</option>
                          {Array.from({ length: universe?.maxTeams || 10 }).map((_, teamIdx) => {
                            const teamName =
                              universe?.gameState?.teams?.[teamIdx]?.name || `Team ${teamIdx + 1}`;
                            return (
                              <option key={teamIdx} value={teamIdx}>
                                Team {teamIdx + 1}: {teamName}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="p-2">
                        {row.isValid ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> {row.statusMsg}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#FAF8F5] border-t border-[#E0DCD3] flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-[#1F2022] hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Confirm & Import {validCount} Users
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

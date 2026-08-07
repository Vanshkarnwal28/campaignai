import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Download, 
  Edit, 
  Copy, 
  Trash2, 
  Check, 
  Plus, 
  Printer, 
  CornerDownLeft, 
  X,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';

interface ContentCalendarProps {
  businessId: string;
  onToast: (title: string, message: string, type: 'success' | 'alert' | 'info') => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({ businessId, onToast }) => {
  const defaultScheduleDate = new Date().toISOString().slice(0, 10);
  // const [loading, setLoading] = useState(false);
  const [calendarEntries, setCalendarEntries] = useState<any[]>([]);

  // Filter & Month Navigation State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [postTypeFilter, setPostTypeFilter] = useState<string>('ALL');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Google Sheets Selection & Editing State
  const [selectedCell, setSelectedCell] = useState<{ rowId: string; colName: string } | null>(null);
  const [formulaValue, setFormulaValue] = useState<string>('');

  // Modals State
  const [editingEntry, setEditingEntry] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [previewEntry, setPreviewEntry] = useState<any | null>(null);
  const [previewDraft, setPreviewDraft] = useState({
    bio: '',
    caption: '',
    imageUrl: '',
    imageOverlayText: '',
    platform: 'instagram',
  });
  
  // Custom new entry form state
  const [newEntryForm, setNewEntryForm] = useState({
    dayName: 'Monday',
    platform: 'both',
    postType: 'Graphic',
    contentIdea: '',
    contentDescription: '',
    caption: '',
    hashtagsStr: '',
    status: 'PENDING',
    scheduledDate: defaultScheduleDate,
    scheduledTime: '10:00'
  });

  const fetchCalendar = async () => {
    if (!businessId) return;
    
    try {
      const [calendarData, schedulerData] = await Promise.allSettled([
        api.content.getCalendar(businessId),
        api.scheduler.getPosts(businessId),
      ]);

      const calendarList = calendarData.status === 'fulfilled' ? (calendarData.value?.entries || []) : [];
      const schedulerList = schedulerData.status === 'fulfilled' ? (schedulerData.value?.posts || []) : [];

      const existingIds = new Set(calendarList.map((e: any) => e.id));

      const normalizedScheduled = schedulerList
        .filter((sp: any) => !existingIds.has(sp.id))
        .map((sp: any) => ({
          id: sp.id,
          dayName: new Date(sp.scheduledTime?._seconds ? sp.scheduledTime._seconds * 1000 : sp.scheduledTime).toLocaleDateString('en-US', { weekday: 'long' }),
          platform: sp.platform || 'both',
          postType: sp.postType || 'Instant Post',
          contentIdea: sp.headline || (sp.caption ? sp.caption.substring(0, 45) + '...' : 'Scheduled Post'),
          contentDescription: sp.caption || '',
          caption: sp.caption || '',
          hashtags: sp.hashtags || [],
          status: sp.status || 'SCHEDULED',
          scheduledTime: sp.scheduledTime,
          imageUrl: sp.imageUrl || '',
          isSchedulerPost: true,
        }));

      const merged = [...calendarList, ...normalizedScheduled];
      setCalendarEntries(merged);
    } catch (err: any) {
      onToast('Error', err.message || 'Failed to load content calendar', 'alert');
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, [businessId]);

  // Date Formatting: DD/MM/YYYY
  const formatSpreadsheetDate = (dateInput: any) => {
    if (!dateInput) return '';
    let date: Date;
    if (dateInput.toDate && typeof dateInput.toDate === 'function') {
      date = dateInput.toDate();
    } else if (dateInput._seconds) {
      date = new Date(dateInput._seconds * 1000);
    } else {
      date = new Date(dateInput);
    }
    if (isNaN(date.getTime())) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Get field names of selected cell
  const getFieldFromCol = (colName: string) => {
    switch (colName) {
      case 'A': return 'scheduledTime';
      case 'B': return 'postType';
      case 'C': return 'contentIdea';
      case 'D': return 'contentDescription';
      case 'E': return 'caption';
      case 'F': return 'status';
      default: return '';
    }
  };

  // Handle cell click selection
  const handleCellClick = (entry: any, colName: string) => {
    setSelectedCell({ rowId: entry.id, colName });
    const field = getFieldFromCol(colName);
    if (!field) {
      setFormulaValue('');
      return;
    }

    if (field === 'scheduledTime') {
      setFormulaValue(formatSpreadsheetDate(entry[field]));
    } else if (field === 'status') {
      setFormulaValue((entry[field] || 'pending').toLowerCase());
    } else {
      setFormulaValue(entry[field] || '');
    }
  };

  // Save cell edit from formula bar
  const handleSaveCellEdit = async () => {
    if (!selectedCell) return;
    const { rowId, colName } = selectedCell;
    const field = getFieldFromCol(colName);
    if (!field) return;

    
    try {
      let valueToSave: any = formulaValue;
      if (field === 'status') {
        valueToSave = formulaValue.toUpperCase();
      } else if (field === 'scheduledTime') {
        const parts = formulaValue.split('/');
        if (parts.length === 3) {
          const d = parseInt(parts[0]);
          const m = parseInt(parts[1]) - 1;
          const y = parseInt(parts[2]);
          const parsedDate = new Date(y, m, d, 10, 0);
          if (!isNaN(parsedDate.getTime())) {
            valueToSave = parsedDate.toISOString();
          }
        }
      }

      await api.content.updateEntry(rowId, { [field]: valueToSave });
      onToast('Cell Updated', 'Spreadsheet cell updated successfully.', 'success');
      await fetchCalendar();
    } catch (err: any) {
      onToast('Update Failed', err.message || 'Could not save cell edit', 'alert');
    } finally {
      
    }
  };

  // Month navigation
  const handlePrevMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };



  // Row Action Handlers
  const handleDeleteRow = async (id: string) => {
    if (!window.confirm('Delete this row from the spreadsheet?')) return;
    
    try {
      await api.content.deleteEntry(id);
      onToast('Row Deleted', 'Removed calendar entry.', 'success');
      if (selectedCell?.rowId === id) setSelectedCell(null);
      await fetchCalendar();
    } catch (err: any) {
      onToast('Delete Failed', err.message, 'alert');
    } finally {
      
    }
  };

  const handleMarkAsPosted = async (id: string) => {
    
    try {
      await api.content.updateEntry(id, { status: 'POSTED' });
      onToast('Status Updated', 'Marked as posted.', 'success');
      await fetchCalendar();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      
    }
  };

  const handleSchedulePost = async (entry: any) => {
    setPreviewEntry(entry);
    setPreviewDraft({
      bio: entry.profileBio || entry.contentDescription || '',
      caption: entry.caption || '',
      imageUrl: entry.imageUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800',
      imageOverlayText: entry.imageOverlayText || entry.contentIdea || '',
      platform: String(entry.platform || '').toLowerCase() === 'facebook' ? 'facebook' : 'instagram',
    });
  };

  const handlePreviewImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      onToast('Invalid image', 'Please choose a PNG, JPG, or WEBP image.', 'alert');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreviewDraft(prev => ({ ...prev, imageUrl: String(reader.result || '') }));
    reader.readAsDataURL(file);
  };

  const handleConfirmSchedule = async () => {
    if (!previewEntry) return;
    if (!previewDraft.caption.trim()) {
      onToast('Caption required', 'Add post text before scheduling.', 'alert');
      return;
    }
    if (previewDraft.imageUrl.startsWith('data:')) {
      onToast('Use a public image URL', 'Local image previews cannot be fetched by Meta. Paste a public image URL before scheduling.', 'alert');
      return;
    }
    try {
      await api.content.updateEntry(previewEntry.id, {
        caption: previewDraft.caption,
        contentDescription: previewDraft.bio,
        profileBio: previewDraft.bio,
        imageUrl: previewDraft.imageUrl,
        imageOverlayText: previewDraft.imageOverlayText,
      });
      await api.scheduler.schedule({
        businessId,
        calendarEntryId: previewEntry.id,
        caption: previewDraft.caption,
        headline: previewEntry.contentIdea || previewEntry.headline,
        hashtags: previewEntry.hashtags || [],
        imageUrl: previewDraft.imageUrl,
        imageOverlayText: previewDraft.imageOverlayText,
        profileBio: previewDraft.bio,
        platform: previewDraft.platform === 'facebook' ? 'Facebook' : 'Instagram',
        scheduledTime: (() => {
          if (!previewEntry.scheduledTime) return new Date().toISOString();
          const d = new Date(previewEntry.scheduledTime);
          return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
        })(),
        postType: previewEntry.postType,
      });

      await api.content.updateEntry(previewEntry.id, {
        businessId,
        status: 'SCHEDULED',
        caption: previewDraft.caption,
        imageUrl: previewDraft.imageUrl,
        imageOverlayText: previewDraft.imageOverlayText,
      });
      onToast('Scheduled', `Post added to scheduler queue!`, 'success');
      setPreviewEntry(null);
      await fetchCalendar();
    } catch (err: any) {
      onToast('Scheduling Failed', err.message, 'alert');
    } finally {
      
    }
  };

  const handleRegenerateRow = async (id: string) => {
    
    onToast('Regenerating...', 'AI writer generating creative options...', 'info');
    try {
      const res = await api.content.regenerateEntry(id);
      if (res.success) {
        onToast('Regeneration Complete', 'New content written and updated.', 'success');
        await fetchCalendar();
      } else {
        onToast('Regeneration Failed', res.message, 'alert');
      }
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      
    }
  };

  const handleDuplicateRow = async (entry: any) => {
    
    try {
      const entryDate = entry.scheduledTime ? new Date(entry.scheduledTime) : new Date();
      entryDate.setDate(entryDate.getDate() + 1);

      const duplicatedData = {
        businessId,
        dayName: entry.dayName || 'Monday',
        platform: entry.platform || 'Instagram',
        scheduledTime: entryDate.toISOString(),
        contentIdea: `${entry.contentIdea || ''} (Copy)`,
        contentDescription: entry.contentDescription || '',
        caption: entry.caption || '',
        hashtags: entry.hashtags || [],
        postType: entry.postType || 'Graphic',
        status: 'PENDING',
      };

      await api.content.createEntry(duplicatedData);
      onToast('Row Cloned', 'Calendar entry duplicated successfully.', 'success');
      await fetchCalendar();
    } catch (err: any) {
      onToast('Failed to Duplicate', err.message, 'alert');
    } finally {
      
    }
  };

  const handleUpdateEntrySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    
    try {
      const hashtags = typeof editingEntry.hashtags === 'string'
        ? (editingEntry.hashtags as string).split(',').map((h: string) => h.trim()).filter((h: string) => h.length > 0)
        : editingEntry.hashtags;

      const updatedPayload = {
        postType: editingEntry.postType,
        contentIdea: editingEntry.contentIdea,
        contentDescription: editingEntry.contentDescription,
        caption: editingEntry.caption,
        status: editingEntry.status,
        hashtags: hashtags || [],
      };

      await api.content.updateEntry(editingEntry.id, updatedPayload);
      onToast('Saved', 'Content row updated successfully.', 'success');
      setIsEditModalOpen(false);
      setEditingEntry(null);
      await fetchCalendar();
    } catch (err: any) {
      onToast('Update Failed', err.message, 'alert');
    } finally {
      
    }
  };

  const handleAddCustomEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const hashtags = newEntryForm.hashtagsStr
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      const [year, month, dateDay] = newEntryForm.scheduledDate.split('-').map(Number);
      const [hours, minutes] = newEntryForm.scheduledTime.split(':').map(Number);
      const scheduledTime = new Date(year, month - 1, dateDay, hours, minutes);

      const payload = {
        businessId,
        dayName: newEntryForm.dayName,
        platform: newEntryForm.platform,
        scheduledTime: scheduledTime.toISOString(),
        contentIdea: newEntryForm.contentIdea,
        contentDescription: newEntryForm.contentDescription,
        caption: newEntryForm.caption,
        hashtags,
        postType: newEntryForm.postType,
        status: newEntryForm.status,
      };

      await api.content.createEntry(payload);
      onToast('Entry Created', 'Custom row added to calendar.', 'success');
      setIsAddModalOpen(false);
      setNewEntryForm({
        dayName: 'Monday',
        platform: 'both',
        postType: 'Graphic',
        contentIdea: '',
        contentDescription: '',
        caption: '',
        hashtagsStr: '',
        status: 'PENDING',
        scheduledDate: defaultScheduleDate,
        scheduledTime: '10:00'
      });
      await fetchCalendar();
    } catch (err: any) {
      onToast('Error', err.message, 'alert');
    } finally {
      
    }
  };

  // Exporters
  const handleExportCSV = () => {
    const headers = ['Date', 'Post Type', 'Content Idea', 'Content Description', 'Caption with hashtag', 'Status'];
    const rows = filteredEntries.map(entry => [
      entry.scheduledTime ? formatSpreadsheetDate(entry.scheduledTime) : '',
      entry.postType || 'Graphic',
      entry.contentIdea || '',
      entry.contentDescription || '',
      entry.caption || '',
      (entry.status || 'PENDING').toLowerCase()
    ]);
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `content_calendar_${businessId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const headers = ['Date', 'Post Type', 'Content Idea', 'Content Description', 'Caption with hashtag', 'Status'];
    const rows = filteredEntries.map(entry => [
      entry.scheduledTime ? formatSpreadsheetDate(entry.scheduledTime) : '',
      entry.postType || 'Graphic',
      entry.contentIdea || '',
      entry.contentDescription || '',
      entry.caption || '',
      (entry.status || 'PENDING').toLowerCase()
    ]);
    const tabContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tabContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `content_calendar_${businessId}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    window.print();
  };

  // Filtering matching target month
  const filteredEntries = calendarEntries.filter((entry) => {
    const idea = (entry.contentIdea || '').toLowerCase();
    const desc = (entry.contentDescription || '').toLowerCase();
    const cap = (entry.caption || '').toLowerCase();
    const type = (entry.postType || '').toLowerCase();
    const query = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || idea.includes(query) || desc.includes(query) || cap.includes(query) || type.includes(query);

    const matchesStatus = statusFilter === 'ALL' || (entry.status || 'PENDING').toUpperCase() === statusFilter.toUpperCase();
    const matchesPostType = postTypeFilter === 'ALL' || (entry.postType || '').toLowerCase() === postTypeFilter.toLowerCase();

    let entryDate: Date | null = null;
    if (entry.scheduledTime) {
      if (entry.scheduledTime.toDate && typeof entry.scheduledTime.toDate === 'function') {
        entryDate = entry.scheduledTime.toDate();
      } else if (entry.scheduledTime._seconds) {
        entryDate = new Date(entry.scheduledTime._seconds * 1000);
      } else {
        entryDate = new Date(entry.scheduledTime);
      }
    }
    const matchesMonth = entryDate 
      ? entryDate.getMonth() === currentDate.getMonth() && entryDate.getFullYear() === currentDate.getFullYear()
      : false;

    return matchesSearch && matchesStatus && matchesPostType && matchesMonth;
  });

  const monthYearString = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const dataRowsCount = filteredEntries.length;
  const paddingRowsNeeded = Math.max(12 - dataRowsCount, 0);
  const paddingRowsArray = Array.from({ length: paddingRowsNeeded });

  // Explicit CSS rules for spreadsheet appearance
  const tableContainerStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
    overflow: 'hidden',
    marginTop: '20px'
  };

  const scrollContainerStyle: React.CSSProperties = {
    overflowX: 'auto',
    overflowY: 'auto',
    maxHeight: '620px'
  };

  const tableStyle: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    fontFamily: 'Arial, sans-serif',
    fontSize: '13px',
    color: '#1e293b',
    tableLayout: 'fixed',
    minWidth: '1200px'
  };

  const thStyle: React.CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    padding: '8px 12px',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: '11px',
    userSelect: 'none'
  };

  const rowHeaderStyle: React.CSSProperties = {
    background: '#f1f5f9',
    color: '#475569',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    padding: '8px 4px',
    textAlign: 'center',
    width: '45px',
    fontWeight: 'bold',
    userSelect: 'none'
  };

  const cellStyle = (isSelected: boolean, alignment: 'left' | 'right' | 'center', vertical: 'top' | 'bottom'): React.CSSProperties => ({
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #cbd5e1',
    padding: '10px 12px',
    textAlign: alignment,
    verticalAlign: vertical,
    cursor: 'cell',
    position: 'relative',
    background: isSelected ? 'rgba(99, 102, 241, 0.05)' : '#ffffff',
    outline: isSelected ? '2px solid #4f46e5' : 'none',
    outlineOffset: '-2px',
    wordBreak: 'break-word'
  });

  return (
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Banner Control Bar */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '20px', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ padding: '10px', background: '#e0e7ff', borderRadius: '12px' }}>
            <CalendarIcon className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Content Calendar Spreadsheet</h2>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Interactive sheet editor. Click cells to modify copies, manage posting plans, or export spreadsheets.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Plus className="w-4 h-4" /> Add Row
          </button>
          <button
            onClick={handleExportCSV}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Download className="w-3.5 h-3.5" /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 14px', background: '#ffffff', border: '1px solid #cbd5e1', color: '#334155', borderRadius: '10px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            <Printer className="w-3.5 h-3.5" /> Print / PDF
          </button>
        </div>
      </div>

      {/* Filter Options */}
      <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', background: '#ffffff', border: '1px solid #e2e8f0', padding: '12px 16px', borderRadius: '16px', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)', gap: '16px' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', width: '280px' }}>
          <Search className="w-4 h-4 text-slate-400" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            style={{ width: '100%', padding: '8px 12px 8px 34px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '0.8rem', color: '#1e293b', outline: 'none' }}
            placeholder="Search matching words..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>STATUS:</span>
            <select
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="PENDING">Pending</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="POSTED">Posted</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '10px' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'bold' }}>FORMAT:</span>
            <select
              style={{ background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
              value={postTypeFilter}
              onChange={(e) => setPostTypeFilter(e.target.value)}
            >
              <option value="ALL">All</option>
              <option value="Graphic">Graphic</option>
              <option value="Reel">Reel</option>
              <option value="Carousel">Carousel</option>
              <option value="Story">Story</option>
              <option value="Video">Video</option>
              <option value="Blog">Blog</option>
              <option value="Poll">Poll</option>
            </select>
          </div>

          {/* Month Navigator */}
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #cbd5e1', background: '#f8fafc', borderRadius: '10px', overflow: 'hidden' }}>
            <button onClick={handlePrevMonth} style={{ padding: '6px 10px', border: 'none', background: 'transparent', borderRight: '1px solid #cbd5e1', cursor: 'pointer', color: '#475569' }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span style={{ padding: '0 16px', fontSize: '0.8rem', fontWeight: 'bold', color: '#1e293b', minWidth: '110px', textAlign: 'center' }}>
              {monthYearString}
            </span>
            <button onClick={handleNextMonth} style={{ padding: '6px 10px', border: 'none', background: 'transparent', borderLeft: '1px solid #cbd5e1', cursor: 'pointer', color: '#475569' }}>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>

      {/* Formula Bar */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', overflow: 'hidden', fontSize: '0.8rem' }}>
        <div style={{ background: '#f1f5f9', padding: '8px 16px', borderRight: '1px solid #cbd5e1', color: '#64748b', fontWeight: 'bold', fontStyle: 'italic', userSelect: 'none', minWidth: '52px', textAlign: 'center' }}>
          fx
        </div>
        <input
          type="text"
          style={{ flex: 1, padding: '8px 16px', background: '#ffffff', color: '#1e293b', border: 'none', outline: 'none' }}
          placeholder={selectedCell ? "Type here to edit the selected cell and press Enter..." : "Select any cell below to view or edit its contents..."}
          value={formulaValue}
          onChange={(e) => setFormulaValue(e.target.value)}
          disabled={!selectedCell}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSaveCellEdit();
          }}
        />
        {selectedCell && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingRight: '8px', borderLeft: '1px solid #e2e8f0' }}>
            <button
              onClick={handleSaveCellEdit}
              title="Apply edits (Enter)"
              style={{ padding: '6px', border: 'none', background: 'transparent', color: '#4f46e5', cursor: 'pointer', borderRadius: '6px' }}
            >
              <CornerDownLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSelectedCell(null);
                setFormulaValue('');
              }}
              title="Cancel"
              style={{ padding: '6px', border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', borderRadius: '6px' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Spreadsheet Grid Table */}
      <div style={tableContainerStyle}>
        <div style={scrollContainerStyle}>
          <table style={tableStyle}>
            
            {/* Columns (A - I) */}
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <th style={{ ...thStyle, width: '45px', background: '#e2e8f0', borderRight: '1px solid #cbd5e1' }}></th>
                <th style={{ ...thStyle, width: '130px' }}>A</th>
                <th style={{ ...thStyle, width: '110px' }}>B</th>
                <th style={{ ...thStyle, width: '200px' }}>C</th>
                <th style={{ ...thStyle, width: '220px' }}>D</th>
                <th style={{ ...thStyle, width: '380px' }}>E</th>
                <th style={{ ...thStyle, width: '100px' }}>F</th>
                <th style={{ ...thStyle, width: '180px' }} className="no-print">G</th>
                <th style={{ ...thStyle, width: '80px' }}>H</th>
                <th style={{ ...thStyle, width: '80px', borderRight: 'none' }}>I</th>
              </tr>
            </thead>

            <tbody>
              
              {/* Row 1: Header values (Date, Post Type, Content Idea, Content Description, Caption with hashtag, Status, Actions) */}
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                <td style={rowHeaderStyle}>1</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Date</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Post Type</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Content Idea</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Content Description</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Caption with hashtag</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'left' }}>Status</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '10px 12px', fontWeight: 'bold', textAlign: 'center' }} className="no-print">Actions</td>
                <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}></td>
                <td style={{ borderBottom: '1px solid #cbd5e1' }}></td>
              </tr>

              {/* Real Data Rows */}
              {filteredEntries.map((entry, idx) => {
                const rowNum = idx + 2;
                const formattedDate = entry.scheduledTime ? formatSpreadsheetDate(entry.scheduledTime) : '';
                const lowercaseStatus = (entry.status || 'pending').toLowerCase();

                return (
                  <tr key={entry.id} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    
                    {/* Row Index */}
                    <td style={rowHeaderStyle}>{rowNum}</td>

                    {/* Date (Column A) - Aligned bottom right */}
                    <td 
                      onClick={() => handleCellClick(entry, 'A')}
                      style={cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'A', 'right', 'bottom')}
                    >
                      {formattedDate}
                    </td>

                    {/* Post Type (Column B) - Aligned bottom left */}
                    <td 
                      onClick={() => handleCellClick(entry, 'B')}
                      style={cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'B', 'left', 'bottom')}
                    >
                      {entry.postType || 'Graphic'}
                    </td>

                    {/* Content Idea (Column C) - Aligned bottom left */}
                    <td 
                      onClick={() => handleCellClick(entry, 'C')}
                      style={cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'C', 'left', 'bottom')}
                    >
                      {entry.contentIdea || ''}
                    </td>

                    {/* Content Description (Column D) - Aligned bottom left */}
                    <td 
                      onClick={() => handleCellClick(entry, 'D')}
                      style={cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'D', 'left', 'bottom')}
                    >
                      {entry.contentDescription || ''}
                    </td>

                    {/* Caption with hashtag (Column E) - Aligned top left, pre-wrap */}
                    <td 
                      onClick={() => handleCellClick(entry, 'E')}
                      style={{
                        ...cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'E', 'left', 'top'),
                        whiteSpace: 'pre-wrap'
                      }}
                    >
                      {entry.caption || ''}
                    </td>

                    {/* Status (Column F) - Aligned bottom left */}
                    <td 
                      onClick={() => handleCellClick(entry, 'F')}
                      style={cellStyle(selectedCell?.rowId === entry.id && selectedCell?.colName === 'F', 'left', 'bottom')}
                    >
                      {lowercaseStatus}
                    </td>

                    {/* Actions Column (Column G) */}
                    <td 
                      style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '6px', textAlign: 'center', verticalAlign: 'middle' }}
                      className="no-print"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                        <button
                          onClick={() => {
                            setEditingEntry({ ...entry, hashtags: (entry.hashtags || []).join(', ') });
                            setIsEditModalOpen(true);
                          }}
                          title="Modify content fields"
                          style={{ padding: '4px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateRow(entry)}
                          title="Duplicate row"
                          style={{ padding: '4px', border: '1px solid #cbd5e1', background: '#ffffff', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRegenerateRow(entry.id)}
                          title="AI rewrite variant"
                          style={{ padding: '4px', border: '1px solid #e0e7ff', background: '#f5f3ff', borderRadius: '4px', cursor: 'pointer', color: '#4f46e5' }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRow(entry.id)}
                          title="Delete entry"
                          style={{ padding: '4px', border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '4px', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {entry.status !== 'POSTED' && (
                          <button
                            onClick={() => handleMarkAsPosted(entry.id)}
                            title="Mark as Posted"
                            style={{ padding: '4px', border: '1px solid #d1fae5', background: '#ecfdf5', borderRadius: '4px', cursor: 'pointer', color: '#059669' }}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {entry.status !== 'SCHEDULED' && (
                          <button
                            onClick={() => handleSchedulePost(entry)}
                            style={{ padding: '4px 8px', border: 'none', background: '#4f46e5', color: '#ffffff', borderRadius: '4px', cursor: 'pointer', fontSize: '10px', fontWeight: 'bold' }}
                          >
                            Schedule
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Padding Empty Columns */}
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1' }}></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1' }}></td>

                  </tr>
                );
              })}

              {/* Spreadsheet Empty Rows padding */}
              {paddingRowsArray.map((_, idx) => {
                const rowNum = dataRowsCount + idx + 2;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #cbd5e1' }}>
                    <td style={rowHeaderStyle}>{rowNum}</td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }} className="no-print"></td>
                    <td style={{ borderRight: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                    <td style={{ borderBottom: '1px solid #cbd5e1', padding: '16px' }}></td>
                  </tr>
                );
              })}

            </tbody>

          </table>
        </div>
      </div>

      {/* EDIT MODAL */}
      {isEditModalOpen && editingEntry && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Modify Spreadsheet Row</h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingEntry(null); }}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateEntrySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Post Type</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                    value={editingEntry.postType}
                    onChange={(e) => setEditingEntry({ ...editingEntry, postType: e.target.value })}
                  >
                    <option value="Graphic">Graphic</option>
                    <option value="Reel">Reel</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Story">Story</option>
                    <option value="Video">Video</option>
                    <option value="Blog">Blog</option>
                    <option value="Poll">Poll</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                    value={editingEntry.status}
                    onChange={(e) => setEditingEntry({ ...editingEntry, status: e.target.value })}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="POSTED">Posted</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Publish To</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                    value={newEntryForm.platform}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, platform: e.target.value })}
                  >
                    <option value="both">Facebook + Instagram</option>
                    <option value="facebook">Facebook only</option>
                    <option value="instagram">Instagram only</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Content Idea</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  value={editingEntry.contentIdea}
                  onChange={(e) => setEditingEntry({ ...editingEntry, contentIdea: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Short Description</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  value={editingEntry.contentDescription}
                  onChange={(e) => setEditingEntry({ ...editingEntry, contentDescription: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Caption</label>
                <textarea
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none', resize: 'vertical' }}
                  rows={4}
                  value={editingEntry.caption}
                  onChange={(e) => setEditingEntry({ ...editingEntry, caption: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Hashtags (comma separated)</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  placeholder="e.g. discount, summer, branding"
                  value={editingEntry.hashtags}
                  onChange={(e) => setEditingEntry({ ...editingEntry, hashtags: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'end', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingEntry(null); }}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', borderRadius: '8px', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Save Changes
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ADD CUSTOM ROW MODAL */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '16px', maxWidth: '500px', width: '100%', padding: '24px', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.25)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Add Custom Post Row</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                style={{ border: 'none', background: 'transparent', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomEntry} style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '0.8rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Day Name</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                    value={newEntryForm.dayName}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, dayName: e.target.value })}
                  >
                    <option value="Monday">Monday</option>
                    <option value="Tuesday">Tuesday</option>
                    <option value="Wednesday">Wednesday</option>
                    <option value="Thursday">Thursday</option>
                    <option value="Friday">Friday</option>
                    <option value="Saturday">Saturday</option>
                    <option value="Sunday">Sunday</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Post Type</label>
                  <select
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                    value={newEntryForm.postType}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, postType: e.target.value })}
                  >
                    <option value="Graphic">Graphic</option>
                    <option value="Reel">Reel</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Story">Story</option>
                    <option value="Video">Video</option>
                    <option value="Blog">Blog</option>
                    <option value="Poll">Poll</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Publish To</label>
                <select
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#f8fafc', outline: 'none' }}
                  value={newEntryForm.platform}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, platform: e.target.value })}
                >
                  <option value="both">Facebook + Instagram</option>
                  <option value="facebook">Facebook only</option>
                  <option value="instagram">Instagram only</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Scheduled Date</label>
                  <input
                    type="date"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                    value={newEntryForm.scheduledDate}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, scheduledDate: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Scheduled Time</label>
                  <input
                    type="time"
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                    value={newEntryForm.scheduledTime}
                    onChange={(e) => setNewEntryForm({ ...newEntryForm, scheduledTime: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Content Idea</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  placeholder="e.g. Exclusive Weekend Product Launch Discount"
                  value={newEntryForm.contentIdea}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, contentIdea: e.target.value })}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Short Description</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  placeholder="e.g. Promote the weekend sale with creative visual assets."
                  value={newEntryForm.contentDescription}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, contentDescription: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Caption</label>
                <textarea
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none', resize: 'vertical' }}
                  rows={3}
                  placeholder="Engaging caption for the post"
                  value={newEntryForm.caption}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, caption: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Hashtags (comma separated)</label>
                <input
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#ffffff', outline: 'none' }}
                  placeholder="e.g. discount, summer, shopping"
                  value={newEntryForm.hashtagsStr}
                  onChange={(e) => setNewEntryForm({ ...newEntryForm, hashtagsStr: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'end', gap: '8px', marginTop: '12px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', borderRadius: '8px', color: '#ffffff', cursor: 'pointer', fontWeight: 600 }}
                >
                  Add Entry
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {previewEntry && (
        <div onClick={() => setPreviewEntry(null)} style={{ position: 'fixed', inset: 0, zIndex: 120, background: 'rgba(15, 23, 42, 0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', cursor: 'pointer' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(1080px, 100%)', maxHeight: '94vh', overflowY: 'auto', background: '#ffffff', borderRadius: '18px', padding: '24px', boxShadow: '0 25px 60px rgba(15,23,42,.35)', cursor: 'default' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <div>
                <h3 style={{ margin: 0, color: '#0f172a', fontSize: '1.15rem' }}>Review post before scheduling</h3>
                <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: '0.78rem' }}>Edit the profile bio, post copy, image, and text shown on the image.</p>
              </div>
              <button type="button" onClick={() => setPreviewEntry(null)} style={{ border: 'none', background: '#f1f5f9', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer' }}><X size={16} /></button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 380px) 1fr', gap: '24px', alignItems: 'start' }}>
              <div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button type="button" onClick={() => setPreviewDraft(prev => ({ ...prev, platform: 'facebook' }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: previewDraft.platform === 'facebook' ? '2px solid #1877f2' : '1px solid #cbd5e1', background: previewDraft.platform === 'facebook' ? '#eff6ff' : '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>Facebook</button>
                  <button type="button" onClick={() => setPreviewDraft(prev => ({ ...prev, platform: 'instagram' }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: previewDraft.platform === 'instagram' ? '2px solid #d946ef' : '1px solid #cbd5e1', background: previewDraft.platform === 'instagram' ? '#fdf4ff' : '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>Instagram</button>
                  <button type="button" onClick={() => setPreviewDraft(prev => ({ ...prev, platform: 'both' }))} style={{ flex: 1, padding: '8px 4px', borderRadius: '8px', border: previewDraft.platform === 'both' ? '2px solid #4f46e5' : '1px solid #cbd5e1', background: previewDraft.platform === 'both' ? '#eeef4f' : '#fff', color: '#1e293b', cursor: 'pointer', fontWeight: 700, fontSize: '0.78rem' }}>Both (FB & IG)</button>
                </div>
                <div style={{ border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px', padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: previewDraft.platform === 'facebook' ? '#1877f2' : previewDraft.platform === 'instagram' ? 'linear-gradient(135deg,#f97316,#d946ef)' : 'linear-gradient(135deg,#1877f2,#d946ef)',
                      color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 800
                    }}>
                      {previewDraft.platform === 'both' ? 'FB+IG' : 'H'}
                    </div>
                    <div><strong style={{ display: 'block', fontSize: '0.8rem' }}>helloworld</strong><span style={{ color: '#64748b', fontSize: '0.68rem' }}>{previewDraft.bio || 'Your profile bio'} ({previewDraft.platform.toUpperCase()})</span></div>
                  </div>
                  <div style={{ position: 'relative', aspectRatio: '1', background: '#e2e8f0' }}>
                    <img src={previewDraft.imageUrl} alt="Social post preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    {previewDraft.imageOverlayText && <div style={{ position: 'absolute', left: '8%', right: '8%', bottom: '9%', padding: '12px 10px', borderRadius: '8px', background: 'rgba(15,23,42,.72)', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 'clamp(.75rem, 2vw, 1.1rem)' }}>{previewDraft.imageOverlayText}</div>}
                  </div>
                  <div style={{ padding: '12px', fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}><strong>helloworld</strong> {previewDraft.caption}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Profile bio
                  <input value={previewDraft.bio} onChange={e => setPreviewDraft(prev => ({ ...prev, bio: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} placeholder="Short profile bio shown in the preview" />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Post caption
                  <textarea value={previewDraft.caption} onChange={e => setPreviewDraft(prev => ({ ...prev, caption: e.target.value }))} rows={6} style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, resize: 'vertical' }} />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Text embedded in image
                  <input value={previewDraft.imageOverlayText} onChange={e => setPreviewDraft(prev => ({ ...prev, imageOverlayText: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} placeholder="Headline shown over the image" />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Public image URL
                  <input value={previewDraft.imageUrl.startsWith('data:') ? '' : previewDraft.imageUrl} onChange={e => setPreviewDraft(prev => ({ ...prev, imageUrl: e.target.value }))} style={{ display: 'block', width: '100%', marginTop: 5, padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8 }} placeholder="https://..." />
                </label>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569' }}>Choose local image for preview
                  <input type="file" accept="image/png,image/jpeg,image/webp" onChange={handlePreviewImageUpload} style={{ display: 'block', marginTop: 7 }} />
                </label>
                <p style={{ margin: 0, color: '#64748b', fontSize: '0.72rem' }}>The overlay is shown in the preview. Meta must receive a public image URL, so replace a local preview image with its hosted URL before scheduling.</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: 4 }}>
                  <button type="button" onClick={() => setPreviewEntry(null)} style={{ padding: '10px 16px', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 8, cursor: 'pointer' }}>Back</button>
                  <button type="button" onClick={handleConfirmSchedule} style={{ padding: '10px 18px', border: 'none', background: '#4f46e5', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>Approve & schedule</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

import { FileText, Plus, Search, File, Download, Eye, Folder } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

export default function Documents() {
  const { colors } = useTheme();

  const documentStats = [
    { label: 'Total Documents', count: 1248, color: colors.primary },
    { label: 'Manuals', count: 156, color: colors.success },
    { label: 'Procedures', count: 89, color: colors.warning },
    { label: 'Certificates', count: 45, color: colors.info }
  ];

  const documents = [
    {
      id: '1',
      name: 'Pump Maintenance Manual',
      type: 'Manual',
      category: 'Equipment',
      size: '2.4 MB',
      format: 'PDF',
      uploadedBy: 'John Smith',
      uploadedDate: '2024-01-15',
      lastAccessed: '2 days ago',
      downloads: 23
    },
    {
      id: '2',
      name: 'Safety Procedures Checklist',
      type: 'Procedure',
      category: 'Safety',
      size: '156 KB',
      format: 'PDF',
      uploadedBy: 'Jane Doe',
      uploadedDate: '2024-01-10',
      lastAccessed: '1 week ago',
      downloads: 45
    },
    {
      id: '3',
      name: 'HVAC System Schematic',
      type: 'Drawing',
      category: 'Technical',
      size: '5.2 MB',
      format: 'DWG',
      uploadedBy: 'Mike Johnson',
      uploadedDate: '2024-01-08',
      lastAccessed: '3 days ago',
      downloads: 12
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Manual': return colors.primary;
      case 'Procedure': return colors.success;
      case 'Drawing': return colors.warning;
      case 'Certificate': return colors.info;
      default: return colors.mutedForeground;
    }
  };

  const getFileIcon = (format: string) => {
    switch (format.toLowerCase()) {
      case 'pdf': return FileText;
      case 'dwg': return File;
      case 'doc':
      case 'docx': return FileText;
      default: return File;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: colors.foreground }}>Documents</h1>
          <p className="mt-1" style={{ color: colors.mutedForeground }}>
            Manage maintenance documentation and files
          </p>
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 rounded-xl hover:opacity-90 transition-colors"
          style={{ backgroundColor: colors.primary, color: 'white' }}
        >
          <Plus className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Document Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {documentStats.map((stat, index) => (
          <div 
            key={index}
            className="rounded-xl border p-4 shadow-sm text-center hover:shadow-md transition-shadow"
            style={{ backgroundColor: colors.card, borderColor: colors.border }}
          >
            <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.count}</div>
            <div className="text-sm" style={{ color: colors.mutedForeground }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search and Categories */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
            style={{ color: colors.mutedForeground }}
          />
          <input
            type="text"
            placeholder="Search documents..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border focus:outline-none focus:ring-2 focus:ring-ring"
            style={{ 
              backgroundColor: colors.background, 
              borderColor: colors.border,
              color: colors.foreground
            }}
          />
        </div>
        <button 
          className="flex items-center gap-2 px-4 py-2 border rounded-xl hover:bg-opacity-80 transition-colors"
          style={{ borderColor: colors.border, color: colors.foreground }}
        >
          <Folder className="w-4 h-4" />
          Categories
        </button>
      </div>

      {/* Documents List */}
      <div className="space-y-4">
        {documents.map((doc) => {
          const FileIcon = getFileIcon(doc.format);
          return (
            <div 
              key={doc.id}
              className="rounded-xl border p-6 shadow-sm hover:shadow-md transition-shadow"
              style={{ backgroundColor: colors.card, borderColor: colors.border }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${getTypeColor(doc.type)}20` }}
                  >
                    <FileIcon className="w-6 h-6" style={{ color: getTypeColor(doc.type) }} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold" style={{ color: colors.foreground }}>
                        {doc.name}
                      </h3>
                      <span 
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ 
                          backgroundColor: `${getTypeColor(doc.type)}20`,
                          color: getTypeColor(doc.type)
                        }}
                      >
                        {doc.type}
                      </span>
                      <span 
                        className="px-2 py-1 text-xs rounded-full"
                        style={{ 
                          backgroundColor: `${colors.accent}20`,
                          color: colors.accent
                        }}
                      >
                        {doc.category}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span style={{ color: colors.mutedForeground }}>Size:</span>
                        <div className="font-medium" style={{ color: colors.foreground }}>{doc.size}</div>
                      </div>
                      <div>
                        <span style={{ color: colors.mutedForeground }}>Format:</span>
                        <div className="font-medium" style={{ color: colors.foreground }}>{doc.format}</div>
                      </div>
                      <div>
                        <span style={{ color: colors.mutedForeground }}>Uploaded by:</span>
                        <div className="font-medium" style={{ color: colors.foreground }}>{doc.uploadedBy}</div>
                      </div>
                      <div>
                        <span style={{ color: colors.mutedForeground }}>Downloads:</span>
                        <div className="font-medium" style={{ color: colors.foreground }}>{doc.downloads}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm" style={{ color: colors.mutedForeground }}>
                      <span>Uploaded: {doc.uploadedDate}</span>
                      <span>Last accessed: {doc.lastAccessed}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    className="flex items-center gap-1 px-3 py-1 border rounded-lg hover:bg-opacity-80 transition-colors text-sm"
                    style={{ borderColor: colors.border, color: colors.foreground }}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button 
                    className="flex items-center gap-1 px-3 py-1 rounded-lg hover:opacity-90 transition-colors text-sm"
                    style={{ backgroundColor: colors.primary, color: 'white' }}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
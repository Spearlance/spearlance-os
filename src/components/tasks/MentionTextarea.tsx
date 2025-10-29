import React, { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";

interface User {
  id: string;
  name: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  users: User[];
  placeholder?: string;
  rows?: number;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  users,
  placeholder,
  rows = 3,
}) => {
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart;
    
    onChange(newValue);
    setCursorPosition(newCursorPos);

    // Check if @ was typed
    const textBeforeCursor = newValue.slice(0, newCursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      // Show mentions if @ is followed by word characters or nothing
      if (/^\w*$/.test(textAfterAt)) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const handleMentionSelect = (user: User) => {
    const textBeforeCursor = value.slice(0, cursorPosition);
    const textAfterCursor = value.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    const newValue = 
      textBeforeCursor.slice(0, lastAtIndex) + 
      `@${user.name} ` + 
      textAfterCursor;
    
    onChange(newValue);
    setShowMentions(false);
    
    // Focus back on textarea
    setTimeout(() => {
      textareaRef.current?.focus();
      const newCursorPos = lastAtIndex + user.name.length + 2;
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        placeholder={placeholder}
        value={value}
        onChange={handleTextChange}
        rows={rows}
      />
      
      {showMentions && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 w-full mb-2 bg-popover border rounded-md shadow-md max-h-48 overflow-auto z-50">
          <Command>
            <CommandList>
              {filteredUsers.length === 0 && (
                <CommandEmpty>No users found.</CommandEmpty>
              )}
              <CommandGroup>
                {filteredUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleMentionSelect(user)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-xs">
                        {user.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{user.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
};

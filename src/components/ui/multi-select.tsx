import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allLabel?: string;
  className?: string;
}

const MultiSelect = ({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  allLabel = "All",
  className,
}: MultiSelectProps) => {
  const [open, setOpen] = React.useState(false);
  const allSelected = options.length > 0 && selected.length === options.length;

  const toggle = (option: string) => {
    onChange(selected.includes(option) ? selected.filter((o) => o !== option) : [...selected, option]);
  };

  const toggleAll = () => {
    onChange(allSelected ? [] : [...options]);
  };

  const remove = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter((o) => o !== option));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-auto min-h-10 w-full justify-between font-normal", className)}
        >
          <div className="flex flex-1 flex-wrap gap-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : allSelected ? (
              <Badge variant="secondary" className="font-normal">{allLabel}</Badge>
            ) : (
              selected.map((option) => (
                <Badge key={option} variant="secondary" className="font-normal">
                  {option}
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-1 rounded-full outline-none hover:bg-muted-foreground/20"
                    onClick={(e) => remove(option, e)}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </Badge>
              ))
            )}
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value={allLabel} onSelect={toggleAll} className="cursor-pointer">
                <div
                  className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    allSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                  )}
                >
                  <Check className={cn("h-3 w-3", allSelected ? "opacity-100" : "opacity-0")} />
                </div>
                {allLabel}
              </CommandItem>
              <CommandSeparator />
              {options.map((option) => {
                const isSelected = selected.includes(option);
                return (
                  <CommandItem key={option} value={option} onSelect={() => toggle(option)} className="cursor-pointer">
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary text-primary-foreground" : "opacity-50",
                      )}
                    >
                      <Check className={cn("h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                    </div>
                    {option}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export { MultiSelect };

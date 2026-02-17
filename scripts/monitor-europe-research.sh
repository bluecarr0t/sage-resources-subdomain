#!/bin/bash
# Monitor Europe glamping research progress

echo "=========================================="
echo "Europe Glamping Research Progress Monitor"
echo "=========================================="
echo ""

# Check CSV files
csv_count=$(find csv/glamping-properties/europe -name "*.csv" -type f 2>/dev/null | wc -l | tr -d ' ')
if [ "$csv_count" -gt 0 ]; then
  echo "✅ CSV Files Generated: $csv_count"
  ls -lh csv/glamping-properties/europe/*.csv 2>/dev/null | awk '{print "   ", $9, "(" $5 ")"}'
else
  echo "⏳ CSV Files: None yet (scripts still running)"
fi

echo ""
echo "📊 Script Progress:"
echo ""

for country in france italy spain uk germany portugal netherlands belgium switzerland; do
  log_file="logs/${country}-research.log"
  country_cap=$(echo "$country" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
  
  if [ ! -f "$log_file" ]; then
    echo "   $country_cap: ❌ Not started"
    continue
  fi
  
  # Check if complete
  if grep -q "Process complete\|Successfully wrote" "$log_file" 2>/dev/null; then
    prop_count=$(grep -o "Total properties saved: [0-9]\+" "$log_file" | grep -o "[0-9]\+" | head -1)
    echo "   $country_cap: ✅ COMPLETE ($prop_count properties)"
    continue
  fi
  
  # Check current search
  last_search=$(grep -oE "Search [0-9]+/[0-9]+" "$log_file" 2>/dev/null | tail -1)
  if [ -n "$last_search" ]; then
    # Check if enriching
    if grep -q "Enriching property data\|\[[0-9]\+/[0-9]\+\]" "$log_file" 2>/dev/null; then
      enrich_line=$(grep "\[[0-9]\+/[0-9]\+\]" "$log_file" | tail -1)
      echo "   $country_cap: 🔄 Enriching properties ($last_search searches done)"
    else
      echo "   $country_cap: 🔍 $last_search"
    fi
  else
    echo "   $country_cap: ⏳ Starting..."
  fi
done

echo ""
echo "💡 Note: CSV files are only created after ALL searches and enrichment complete"
echo "   Estimated time: 30-60 minutes per country"
echo "=========================================="

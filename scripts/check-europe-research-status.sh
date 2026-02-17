#!/bin/bash
# Quick status check for Europe glamping research scripts

echo "=========================================="
echo "Europe Glamping Research Status"
echo "=========================================="
echo ""

echo "📊 CSV Files Generated:"
ls -lh csv/glamping-properties/europe/*.csv 2>/dev/null | awk '{print "  ✓", $9, "(" $5 ")"}' || echo "  ⏳ No CSV files yet"

echo ""
echo "🔄 Running Processes:"
ps aux | grep "research-.*-glamping-resorts.ts" | grep -v grep | wc -l | xargs echo "  Active processes:"

echo ""
echo "📝 Latest Log Activity:"
for country in france italy spain uk germany portugal netherlands belgium switzerland; do
  country_cap=$(echo "$country" | awk '{print toupper(substr($0,1,1)) tolower(substr($0,2))}')
  if [ -f "logs/${country}-research.log" ]; then
    last_line=$(tail -1 "logs/${country}-research.log" 2>/dev/null)
    if [ -n "$last_line" ]; then
      echo "  $country_cap: $(echo "$last_line" | cut -c1-80)..."
    else
      echo "  $country_cap: Starting..."
    fi
  else
    echo "  $country_cap: Waiting to start..."
  fi
done

echo ""
echo "=========================================="

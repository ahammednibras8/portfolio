package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	"net/url"
	"os"
	"regexp"
	"slices"
	"strings"
)

var campaignLabel = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,47}$`)

func main() {
	scanner := bufio.NewScanner(os.Stdin)

	query := url.Values{}
	query.Set("utm_source", readLabel(scanner, "Source", true))
	query.Set("utm_medium", readLabel(scanner, "Medium", true))
	query.Set("utm_campaign", readLabel(scanner, "Campaign", true))

	if placement := readLabel(scanner, "Placement (optional)", false); placement != "" {
		query.Set("utm_content", placement)
	}

	added, err := registerCampaign("src/data/analytics-campaigns.json", query)
	if err != nil {
		fmt.Fprintln(os.Stderr, "Could not register campaign:", err)
		os.Exit(1)
	}
	if added {
		fmt.Fprintln(os.Stderr, "Labels registered. Deploy before sharing the link")
	}

	link := url.URL{
		Scheme:   "https",
		Host:     "ahammednibras.com",
		Path:     "/",
		RawQuery: query.Encode(),
	}
	fmt.Println(link.String())
}

func readLabel(scanner *bufio.Scanner, prompt string, required bool) string {
	fmt.Fprint(os.Stderr, prompt+": ")

	var label string
	if scanner.Scan() {
		label = strings.TrimSpace(scanner.Text())
	} else if err := scanner.Err(); err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}

	if required && label == "" {
		fmt.Fprintln(os.Stderr, prompt+" is required")
		os.Exit(1)
	}

	if label != "" && !campaignLabel.MatchString(label) {
		fmt.Fprintf(os.Stderr, "%s must start with a lowercase letter or digit and use up to 48 lowercase letters, digits, hyphens, or underscores\n", prompt)
		os.Exit(1)
	}

	return label
}

type campaignRegistry struct {
	Sources   []string `json:"utm_source"`
	Media     []string `json:"utm_medium"`
	Campaigns []string `json:"utm_campaign"`
	Content   []string `json:"utm_content"`
}

func registerCampaign(path string, query url.Values) (bool, error) {
	draft, err := os.OpenFile(path+".tmp", os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o644)
	if err != nil {
		return false, err
	}

	published := false
	defer func() {
		_ = draft.Close()
		if !published {
			_ = os.Remove(draft.Name())
		}
	}()

	data, err := os.ReadFile(path)
	if err != nil {
		return false, err
	}

	var approved campaignRegistry
	if err := json.Unmarshal(data, &approved); err != nil {
		return false, err
	}

	added := false
	for key, values := range map[string]*[]string{
		"utm_source":   &approved.Sources,
		"utm_medium":   &approved.Media,
		"utm_campaign": &approved.Campaigns,
		"utm_content":  &approved.Content,
	} {
		if *values == nil {
			return false, fmt.Errorf("registry is missing the %s array", key)
		}
		value := query.Get(key)
		if value != "" && !slices.Contains(*values, value) {
			*values = append(*values, value)
			slices.Sort(*values)
			added = true
		}
	}

	if !added {
		return false, nil
	}

	encoder := json.NewEncoder(draft)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(approved); err != nil {
		return false, err
	}
	if err := draft.Close(); err != nil {
		return false, err
	}
	if err := os.Rename(draft.Name(), path); err != nil {
		return false, err
	}

	published = true
	return true, nil
}

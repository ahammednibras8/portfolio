package main

import (
	"encoding/json"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"testing"
)

const existingRegistry = `{"utm_source":["linkedin"],"utm_medium":["social"],"utm_campaign":["portfolio_launch"],"utm_content":["profile"]}`

func registryFixture(t *testing.T, data string) string {
	t.Helper()
	path := filepath.Join(t.TempDir(), "analytics-campaigns.json")
	if err := os.WriteFile(path, []byte(data), 0o644); err != nil {
		t.Fatal(err)
	}
	return path
}

func readRegistryFile(t *testing.T, path string) string {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	return string(data)
}

func TestRegisterCampaignAddsLabelsOnce(t *testing.T) {
	path := registryFixture(t, existingRegistry)
	query := url.Values{
		"utm_source":   {"meetup"},
		"utm_medium":   {"qr"},
		"utm_campaign": {"community_talk"},
		"utm_content":  {"slides"},
	}
	if added, err := registerCampaign(path, query); !added || err != nil {
		t.Fatalf("first registration returned %t, %v", added, err)
	}
	registered := readRegistryFile(t, path)
	var actual campaignRegistry
	if err := json.Unmarshal([]byte(registered), &actual); err != nil {
		t.Fatal(err)
	}
	expected := campaignRegistry{
		Sources:   []string{"linkedin", "meetup"},
		Media:     []string{"qr", "social"},
		Campaigns: []string{"community_talk", "portfolio_launch"},
		Content:   []string{"profile", "slides"},
	}
	if !reflect.DeepEqual(actual, expected) {
		t.Fatalf("registry = %+v, want %+v", actual, expected)
	}
	if added, err := registerCampaign(path, query); added || err != nil {
		t.Fatalf("repeat registration returned %t, %v", added, err)
	}
	if readRegistryFile(t, path) != registered {
		t.Fatal("repeat registration changed the registry")
	}
}

func TestRegisterCampaignPreservesInvalidRegistry(t *testing.T) {
	cases := map[string]string{
		"malformed JSON": `{`,
		"missing field":  `{"utm_source":["linkedin"]}`,
	}
	for name, input := range cases {
		t.Run(name, func(t *testing.T) {
			path := registryFixture(t, input)
			query := url.Values{"utm_campaign": {"community_talk"}}
			if added, err := registerCampaign(path, query); added || err == nil {
				t.Fatalf("invalid registration returned %t, %v", added, err)
			}
			if readRegistryFile(t, path) != input {
				t.Fatal("registration replaced invalid input")
			}
			if _, err := os.Stat(path + ".tmp"); !os.IsNotExist(err) {
				t.Fatalf("temporary file should be gone, stat error = %v", err)
			}
		})
	}
}

func TestRegisterCampaignPreservesAnotherWritersDraft(t *testing.T) {
	path := registryFixture(t, existingRegistry)
	draft := path + ".tmp"
	const pending = "another writer's draft"
	if err := os.WriteFile(draft, []byte(pending), 0o644); err != nil {
		t.Fatal(err)
	}
	query := url.Values{"utm_campaign": {"community_talk"}}
	if added, err := registerCampaign(path, query); added || !os.IsExist(err) {
		t.Fatalf("locked registration returned %t, %v", added, err)
	}
	if readRegistryFile(t, path) != existingRegistry || readRegistryFile(t, draft) != pending {
		t.Fatal("registration changed files owned by another writer")
	}
}

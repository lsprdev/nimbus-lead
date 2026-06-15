package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

const usersAuthTokenDurationSeconds int64 = 60 * 60 * 24 * 7

func init() {
	m.Register(func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		users.AuthToken.Duration = usersAuthTokenDurationSeconds
		return app.Save(users)
	}, func(app core.App) error {
		users, err := app.FindCollectionByNameOrId("users")
		if err != nil {
			return err
		}

		users.AuthToken.Duration = 60 * 60 * 24 * 5
		return app.Save(users)
	})
}

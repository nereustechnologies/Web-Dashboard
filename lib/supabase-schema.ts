import { supabase } from "@/lib/supabase";

export async function setupSupabaseTables() {
    try {
        // Helper to create a table
        const createTable = async (table_name: string, columns: string) =>
            await supabase.rpc("create_table_if_not_exists", {
                table_name,
                columns,
            });

        await createTable("users", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            role TEXT NOT NULL,
            admin_id UUID REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("customers", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            age INTEGER NOT NULL,
            gender TEXT NOT NULL,
            height FLOAT NOT NULL,
            weight FLOAT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("tests", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status TEXT NOT NULL,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            tester_id UUID REFERENCES users(id) ON DELETE SET NULL,
            start_time TIMESTAMP WITH TIME ZONE,
            end_time TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("exercises", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            completed BOOLEAN DEFAULT FALSE,
            test_id UUID REFERENCES tests(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("imu_tests", `
            id UUID PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            tester_id UUID NOT NULL REFERENCES users(id),
            current_exercise_type TEXT,
            current_exercise_name TEXT,
            start_time TIMESTAMP WITH TIME ZONE NOT NULL,
            end_time TIMESTAMP WITH TIME ZONE,
            status TEXT NOT NULL,
            last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("imu_data", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
            exercise_type TEXT,
            exercise_name TEXT,
            acc_x FLOAT NOT NULL,
            acc_y FLOAT NOT NULL,
            acc_z FLOAT NOT NULL,
            gyr_x FLOAT NOT NULL,
            gyr_y FLOAT NOT NULL,
            gyr_z FLOAT NOT NULL,
            mag_x FLOAT NOT NULL,
            mag_y FLOAT NOT NULL,
            mag_z FLOAT NOT NULL,
            battery FLOAT NOT NULL, 
            timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("device_discoveries", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("device_connections", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            device_id TEXT NOT NULL,
            device_name TEXT NOT NULL,
            connected_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        await createTable("test_downloads", `
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            test_id UUID NOT NULL REFERENCES tests(id) ON DELETE CASCADE,
            download_url TEXT NOT NULL,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        `);

        // Create triggers for updated_at
        const tablesWithUpdatedAt = [
            "users", "customers", "tests", "exercises"
        ];

        for (const table of tablesWithUpdatedAt) {
            await supabase.rpc("create_table_if_not_exists", {
                table_name: `${table}_updated_trigger`,
                columns: `
                    DROP TRIGGER IF EXISTS update_${table}_updated_at ON ${table};
                    CREATE TRIGGER update_${table}_updated_at
                    BEFORE UPDATE ON ${table}
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
                `
            });
        }

        console.log("Supabase tables and triggers set up successfully");
        return true;
    } catch (error) {
        console.error("Error setting up Supabase tables:", error);
        return false;
    }
}

export async function setupSupabaseStorage() {
    try {
        const { data: buckets } = await supabase.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === "test-data");

        if (!exists) {
            await supabase.storage.createBucket("test-data", {
                public: true,
                allowedMimeTypes: ["text/csv", "application/json"],
                fileSizeLimit: 52428800,
            });
        }

        console.log("Supabase storage set up successfully");
        return true;
    } catch (error) {
        console.error("Error setting up Supabase storage:", error);
        return false;
    }
}
